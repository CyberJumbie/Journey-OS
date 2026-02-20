/**
 * Course API client functions.
 * [STORY-F-20] Wizard creation + code uniqueness check.
 */

import type {
  CourseCreateInput,
  CourseCreateResponse,
  CourseCodeCheckResponse,
} from "@journey-os/types";
import { getAuthToken } from "@web/lib/auth/get-auth-token";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface ApiResult<T> {
  data: T | null;
  error: { code: string; message: string } | null;
}

export async function createCourse(
  input: CourseCreateInput,
): Promise<ApiResult<CourseCreateResponse>> {
  const token = await getAuthToken();
  const res = await fetch(`${API_URL}/api/v1/courses/wizard`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  const json = (await res.json()) as ApiResult<CourseCreateResponse>;
  return json;
}

export async function checkCourseCode(
  code: string,
): Promise<ApiResult<CourseCodeCheckResponse>> {
  const token = await getAuthToken();
  const res = await fetch(
    `${API_URL}/api/v1/courses/check-code?code=${encodeURIComponent(code)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  const json = (await res.json()) as ApiResult<CourseCodeCheckResponse>;
  return json;
}

export async function searchInstitutionUsers(
  institutionId: string,
  search: string,
): Promise<
  ApiResult<
    readonly {
      id: string;
      email: string;
      full_name: string;
      role: string;
    }[]
  >
> {
  const token = await getAuthToken();
  const params = new URLSearchParams({
    search,
    role: "faculty",
    limit: "10",
  });
  const res = await fetch(
    `${API_URL}/api/v1/institutions/${institutionId}/users?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  const json = (await res.json()) as ApiResult<
    readonly {
      id: string;
      email: string;
      full_name: string;
      role: string;
    }[]
  >;
  return json;
}
