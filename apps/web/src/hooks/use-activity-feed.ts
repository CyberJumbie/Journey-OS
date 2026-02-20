"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type {
  ActivityEvent,
  ActivityFeedResponse,
  ActivityEventType,
} from "@journey-os/types";
import { createBrowserClient } from "@web/lib/supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const PAGE_SIZE = 20;
const POLL_INTERVAL_MS = 30_000;

type FeedStatus = "loading" | "data" | "error" | "loading_more";

export function useActivityFeed(userId: string) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [status, setStatus] = useState<FeedStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [eventTypes, setEventTypes] = useState<ActivityEventType[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const getToken = useCallback(async (): Promise<string | null> => {
    const supabase = createBrowserClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }, []);

  const buildUrl = useCallback(
    (fetchOffset: number, fetchLimit: number): string => {
      const params = new URLSearchParams({
        user_id: userId,
        limit: String(fetchLimit),
        offset: String(fetchOffset),
      });
      if (eventTypes.length > 0) {
        params.set("event_types", eventTypes.join(","));
      }
      return `${API_URL}/api/v1/activity?${params.toString()}`;
    },
    [userId, eventTypes],
  );

  const fetchPage = useCallback(
    async (fetchOffset: number, append: boolean) => {
      if (!append) {
        setStatus("loading");
      } else {
        setStatus("loading_more");
      }

      try {
        const token = await getToken();
        const res = await fetch(buildUrl(fetchOffset, PAGE_SIZE), {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        const json = (await res.json()) as {
          data: ActivityFeedResponse | null;
          error: { code: string; message: string } | null;
        };

        if (json.error) {
          setError(json.error.message);
          setStatus("error");
          return;
        }

        if (json.data) {
          if (append) {
            setEvents((prev) => [...prev, ...json.data!.events]);
          } else {
            setEvents([...json.data.events]);
          }
          setHasMore(json.data.meta.has_more);
          setOffset(fetchOffset + PAGE_SIZE);
          setError(null);
          setStatus("data");
        }
      } catch {
        setError("Failed to load activity feed");
        setStatus("error");
      }
    },
    [getToken, buildUrl],
  );

  // Initial fetch
  useEffect(() => {
    setOffset(0);
    setEvents([]);
    fetchPage(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, eventTypes]);

  // Load more
  const loadMore = useCallback(() => {
    if (status === "loading_more" || !hasMore) return;
    fetchPage(offset, true);
  }, [fetchPage, offset, hasMore, status]);

  // Polling: fetch latest and prepend new events
  useEffect(() => {
    pollRef.current = setInterval(async () => {
      try {
        const token = await getToken();
        const res = await fetch(buildUrl(0, PAGE_SIZE), {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        const json = (await res.json()) as {
          data: ActivityFeedResponse | null;
          error: { code: string; message: string } | null;
        };

        if (json.data) {
          setEvents((prev) => {
            const existingIds = new Set(prev.map((e) => e.id));
            const newEvents = json.data!.events.filter(
              (e) => !existingIds.has(e.id),
            );
            if (newEvents.length === 0) return prev;
            return [...newEvents, ...prev];
          });
        }
      } catch {
        // Silently ignore polling errors
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [getToken, buildUrl]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting && hasMore && status === "data") {
          loadMore();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore, status]);

  return {
    events,
    status,
    error,
    hasMore,
    loadMore,
    sentinelRef,
    eventTypes,
    setEventTypes,
  };
}
