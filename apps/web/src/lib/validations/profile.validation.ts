import { z } from "zod";
import {
  PROFILE_DISPLAY_NAME_MIN,
  PROFILE_DISPLAY_NAME_MAX,
  PROFILE_BIO_MAX,
  PROFILE_TITLE_MAX,
  PROFILE_DEPARTMENT_MAX,
} from "@journey-os/types";

export const profileFormSchema = z.object({
  display_name: z
    .string()
    .min(
      PROFILE_DISPLAY_NAME_MIN,
      `Display name must be at least ${PROFILE_DISPLAY_NAME_MIN} characters`,
    )
    .max(
      PROFILE_DISPLAY_NAME_MAX,
      `Display name must be at most ${PROFILE_DISPLAY_NAME_MAX} characters`,
    ),
  bio: z
    .string()
    .max(PROFILE_BIO_MAX, `Bio must be at most ${PROFILE_BIO_MAX} characters`),
  department: z
    .string()
    .max(
      PROFILE_DEPARTMENT_MAX,
      `Department must be at most ${PROFILE_DEPARTMENT_MAX} characters`,
    ),
  title: z
    .string()
    .max(
      PROFILE_TITLE_MAX,
      `Title must be at most ${PROFILE_TITLE_MAX} characters`,
    ),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
