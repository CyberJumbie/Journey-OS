"use client";

import { useState, useEffect, useCallback } from "react";
import type { ProfileResponse } from "@journey-os/types";
import { createBrowserClient } from "@web/lib/supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type ProfileStatus = "loading" | "data" | "error";

export function useProfile() {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [status, setStatus] = useState<ProfileStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const getToken = useCallback(async (): Promise<string | null> => {
    const supabase = createBrowserClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }, []);

  const fetchProfile = useCallback(async () => {
    setStatus("loading");
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/v1/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const json = (await res.json()) as {
        data: ProfileResponse | null;
        error: { code: string; message: string } | null;
      };
      if (json.error) {
        setError(json.error.message);
        setStatus("error");
      } else {
        setProfile(json.data);
        setError(null);
        setStatus("data");
      }
    } catch {
      setError("Failed to load profile");
      setStatus("error");
    }
  }, [getToken]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { profile, status, error, refetch: fetchProfile, setProfile };
}
