/**
 * Profile Service — business logic + DualWrite orchestration.
 * [STORY-F-5] Supabase first, Neo4j User node second.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Driver } from "neo4j-driver";
import type {
  ProfileResponse,
  UpdateProfileRequest,
  AvatarUploadResponse,
  AvatarMimeType,
} from "@journey-os/types";
import {
  AVATAR_MAX_SIZE_BYTES,
  AVATAR_ALLOWED_TYPES,
  PROFILE_DISPLAY_NAME_MIN,
  PROFILE_DISPLAY_NAME_MAX,
  PROFILE_BIO_MAX,
  PROFILE_TITLE_MAX,
  PROFILE_DEPARTMENT_MAX,
} from "@journey-os/types";
import type { ProfileRepository } from "../../repositories/profile.repository";
import {
  ProfileNotFoundError,
  ProfileValidationError,
  InvalidAvatarError,
} from "../../errors";

export class ProfileService {
  readonly #repository: ProfileRepository;
  readonly #supabaseClient: SupabaseClient;
  readonly #neo4jDriver: Driver | null;

  constructor(
    repository: ProfileRepository,
    supabaseClient: SupabaseClient,
    neo4jDriver: Driver | null = null,
  ) {
    this.#repository = repository;
    this.#supabaseClient = supabaseClient;
    this.#neo4jDriver = neo4jDriver;
  }

  async getProfile(userId: string): Promise<ProfileResponse> {
    return this.#repository.findByUserId(userId);
  }

  async updateProfile(
    userId: string,
    request: UpdateProfileRequest,
  ): Promise<ProfileResponse> {
    this.#validateUpdateRequest(request);

    const profile = await this.#repository.update(userId, request);

    await this.#tryNeo4jUpdate(userId, request);

    return profile;
  }

  async uploadAvatar(
    userId: string,
    file: {
      buffer: Uint8Array;
      mimetype: string;
      size: number;
      originalname: string;
    },
  ): Promise<AvatarUploadResponse> {
    this.#validateAvatarFile(file);

    const ext = this.#getExtensionFromMime(file.mimetype);
    const filePath = `${userId}/avatar.${ext}`;

    const { error: uploadError } = await this.#supabaseClient.storage
      .from("avatars")
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      throw new InvalidAvatarError(`Upload failed: ${uploadError.message}`);
    }

    const { data: publicUrlData } = this.#supabaseClient.storage
      .from("avatars")
      .getPublicUrl(filePath);

    const avatarUrl = publicUrlData.publicUrl;

    await this.#repository.updateAvatarUrl(userId, avatarUrl);

    return {
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    };
  }

  async removeAvatar(userId: string): Promise<AvatarUploadResponse> {
    // Get current profile to find existing avatar path
    let profile: ProfileResponse | null = null;
    try {
      profile = await this.#repository.findByUserId(userId);
    } catch {
      // If profile not found, nothing to remove
      throw new ProfileNotFoundError(userId);
    }

    // Delete file from storage if it exists (idempotent)
    if (profile.avatar_url) {
      const urlParts = profile.avatar_url.split("/avatars/");
      if (urlParts[1]) {
        await this.#supabaseClient.storage
          .from("avatars")
          .remove([urlParts[1]]);
      }
    }

    await this.#repository.updateAvatarUrl(userId, null);

    return {
      avatar_url: null,
      updated_at: new Date().toISOString(),
    };
  }

  #validateUpdateRequest(request: UpdateProfileRequest): void {
    if (request.display_name !== undefined) {
      const name = request.display_name.trim();
      if (name.length < PROFILE_DISPLAY_NAME_MIN) {
        throw new ProfileValidationError(
          `Display name must be at least ${PROFILE_DISPLAY_NAME_MIN} characters`,
        );
      }
      if (name.length > PROFILE_DISPLAY_NAME_MAX) {
        throw new ProfileValidationError(
          `Display name must be at most ${PROFILE_DISPLAY_NAME_MAX} characters`,
        );
      }
    }

    if (request.bio !== undefined && request.bio.length > PROFILE_BIO_MAX) {
      throw new ProfileValidationError(
        `Bio must be at most ${PROFILE_BIO_MAX} characters`,
      );
    }

    if (
      request.department !== undefined &&
      request.department.length > PROFILE_DEPARTMENT_MAX
    ) {
      throw new ProfileValidationError(
        `Department must be at most ${PROFILE_DEPARTMENT_MAX} characters`,
      );
    }

    if (
      request.title !== undefined &&
      request.title.length > PROFILE_TITLE_MAX
    ) {
      throw new ProfileValidationError(
        `Title must be at most ${PROFILE_TITLE_MAX} characters`,
      );
    }
  }

  #validateAvatarFile(file: {
    buffer: Uint8Array;
    mimetype: string;
    size: number;
  }): void {
    if (file.size > AVATAR_MAX_SIZE_BYTES) {
      throw new InvalidAvatarError(
        `File size ${file.size} exceeds maximum of ${AVATAR_MAX_SIZE_BYTES} bytes (2MB)`,
      );
    }

    if (!AVATAR_ALLOWED_TYPES.includes(file.mimetype as AvatarMimeType)) {
      throw new InvalidAvatarError(
        `File type "${file.mimetype}" is not allowed. Accepted types: ${AVATAR_ALLOWED_TYPES.join(", ")}`,
      );
    }
  }

  #getExtensionFromMime(mimetype: string): string {
    const map: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };
    return map[mimetype] ?? "jpg";
  }

  async #tryNeo4jUpdate(
    userId: string,
    request: UpdateProfileRequest,
  ): Promise<void> {
    if (!this.#neo4jDriver) return;

    const session = this.#neo4jDriver.session();
    try {
      const setFields: string[] = [];
      const params: Record<string, unknown> = { userId };

      if (request.display_name !== undefined) {
        setFields.push("u.name = $displayName");
        params.displayName = request.display_name.trim();
      }
      if (request.department !== undefined) {
        setFields.push("u.department = $department");
        params.department = request.department.trim() || null;
      }
      if (request.title !== undefined) {
        setFields.push("u.title = $title");
        params.title = request.title.trim() || null;
      }

      if (setFields.length === 0) return;

      await session.run(
        `MERGE (u:User {id: $userId})
         SET ${setFields.join(", ")}`,
        params,
      );
    } catch (error: unknown) {
      console.warn(
        `[ProfileService] Neo4j DualWrite update failed for User ${userId}:`,
        error,
      );
    } finally {
      await session.close();
    }
  }
}
