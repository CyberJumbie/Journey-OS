"use client";

import { useState, useEffect, useCallback } from "react";
import type { InstitutionDetail } from "@journey-os/types";
import { getAuthToken } from "@web/lib/auth/get-auth-token";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export type InstitutionDetailStatus =
  | "loading"
  | "data"
  | "error"
  | "not_found";

export interface UseInstitutionDetailReturn {
  detail: InstitutionDetail | null;
  status: InstitutionDetailStatus;
  errorMsg: string;
  refetch: () => void;
}

export function useInstitutionDetail(
  institutionId: string,
): UseInstitutionDetailReturn {
  const [detail, setDetail] = useState<InstitutionDetail | null>(null);
  const [status, setStatus] = useState<InstitutionDetailStatus>("loading");
  const [errorMsg, setErrorMsg] = useState("");

  const fetchDetail = useCallback(async () => {
    setStatus("loading");
    try {
      const token = await getAuthToken();
      const res = await fetch(
        `${API_URL}/api/v1/admin/institutions/${institutionId}/detail`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (res.status === 404) {
        setStatus("not_found");
        return;
      }

      if (!res.ok) {
        const json = await res.json();
        setErrorMsg(json.error?.message ?? "Failed to load institution detail");
        setStatus("error");
        return;
      }

      const json = await res.json();
      setDetail(json.data);
      setStatus("data");
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  }, [institutionId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  return { detail, status, errorMsg, refetch: fetchDetail };
}
