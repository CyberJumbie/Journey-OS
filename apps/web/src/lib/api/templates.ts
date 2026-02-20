import type {
  TemplateDTO,
  TemplateListQuery,
  TemplateListResponse,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  DuplicateTemplateRequest,
} from "@journey-os/types";
import { getAuthToken } from "@web/lib/auth/get-auth-token";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface ApiError {
  readonly code: string;
  readonly message: string;
}

async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<{ data: T | null; error: ApiError | null }> {
  const token = await getAuthToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const json = (await res.json()) as { error?: ApiError };
    return {
      data: null,
      error: json.error ?? { code: "UNKNOWN", message: "Request failed" },
    };
  }

  if (res.status === 204) {
    return { data: null, error: null };
  }

  const json = (await res.json()) as { data: T };
  return { data: json.data, error: null };
}

export async function listTemplates(
  query: TemplateListQuery,
): Promise<{ data: TemplateListResponse | null; error: ApiError | null }> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.sharing_level) params.set("sharing_level", query.sharing_level);
  if (query.question_type) params.set("question_type", query.question_type);
  if (query.search) params.set("search", query.search);
  if (query.owner_only) params.set("owner_only", "true");

  const qs = params.toString();
  return apiFetch<TemplateListResponse>(
    `/api/v1/templates${qs ? `?${qs}` : ""}`,
  );
}

export async function getTemplate(
  id: string,
): Promise<{ data: TemplateDTO | null; error: ApiError | null }> {
  return apiFetch<TemplateDTO>(`/api/v1/templates/${id}`);
}

export async function createTemplate(
  input: CreateTemplateRequest,
): Promise<{ data: TemplateDTO | null; error: ApiError | null }> {
  return apiFetch<TemplateDTO>("/api/v1/templates", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateTemplate(
  id: string,
  input: UpdateTemplateRequest,
): Promise<{ data: TemplateDTO | null; error: ApiError | null }> {
  return apiFetch<TemplateDTO>(`/api/v1/templates/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deleteTemplate(
  id: string,
): Promise<{ data: null; error: ApiError | null }> {
  return apiFetch<null>(`/api/v1/templates/${id}`, { method: "DELETE" });
}

export async function duplicateTemplate(
  id: string,
  input?: DuplicateTemplateRequest,
): Promise<{ data: TemplateDTO | null; error: ApiError | null }> {
  return apiFetch<TemplateDTO>(`/api/v1/templates/${id}/duplicate`, {
    method: "POST",
    body: JSON.stringify(input ?? {}),
  });
}
