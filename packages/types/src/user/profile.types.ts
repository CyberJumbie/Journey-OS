/**
 * Profile types and DTOs.
 * [STORY-F-5] Profile page — update display name, bio, department, title, avatar.
 */

/** Profile update request DTO (from form) */
export interface UpdateProfileRequest {
  readonly display_name?: string;
  readonly bio?: string;
  readonly department?: string;
  readonly title?: string;
}

/** Avatar upload response */
export interface AvatarUploadResponse {
  readonly avatar_url: string | null;
  readonly updated_at: string;
}

/** Profile response for API (extends UserProfile with computed fields) */
export interface ProfileResponse {
  readonly id: string;
  readonly email: string;
  readonly display_name: string | null;
  readonly bio: string | null;
  readonly title: string | null;
  readonly department: string | null;
  readonly avatar_url: string | null;
  readonly role: string;
  readonly institution_id: string;
  readonly institution_name: string;
  readonly is_course_director: boolean;
  readonly onboarding_complete: boolean;
  readonly created_at: string;
  readonly updated_at: string;
}

/** Allowed avatar MIME types */
export type AvatarMimeType = "image/jpeg" | "image/png" | "image/webp";

/** Avatar validation constants */
export const AVATAR_MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
export const AVATAR_ALLOWED_TYPES: readonly AvatarMimeType[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const AVATAR_MAX_DIMENSION = 256;

/** Profile validation constants */
export const PROFILE_DISPLAY_NAME_MIN = 2;
export const PROFILE_DISPLAY_NAME_MAX = 100;
export const PROFILE_BIO_MAX = 500;
export const PROFILE_TITLE_MAX = 100;
export const PROFILE_DEPARTMENT_MAX = 100;
