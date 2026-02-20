import { z } from "zod";

export const templateFormSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(200, "Name must be 200 characters or less"),
  description: z
    .string()
    .max(2000, "Description must be 2000 characters or less"),
  question_type: z.enum([
    "single_best_answer",
    "extended_matching",
    "sequential_item_set",
  ]),
  difficulty_distribution: z
    .object({
      easy: z.number().min(0).max(1),
      medium: z.number().min(0).max(1),
      hard: z.number().min(0).max(1),
    })
    .refine((d) => Math.abs(d.easy + d.medium + d.hard - 1.0) < 0.001, {
      message: "Difficulty distribution must sum to 1.0",
    }),
  bloom_levels: z
    .array(z.number().min(1).max(6))
    .min(1, "Select at least one Bloom level"),
  sharing_level: z.enum([
    "private",
    "shared_course",
    "shared_institution",
    "public",
  ]),
  scope_config: z.object({
    course_id: z.string().optional(),
    usmle_systems: z.array(z.string()).optional(),
  }),
  prompt_overrides: z.object({
    vignette_instructions: z.string().optional(),
    stem_instructions: z.string().optional(),
    clinical_setting: z.string().optional(),
  }),
  metadata: z.object({
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

export type TemplateFormValues = z.infer<typeof templateFormSchema>;
