---
name: react-hook-form-zod-pattern
tags: [react-hook-form, zod, forms, validation, frontend]
story: STORY-F-5
date: 2026-02-20
---

# React Hook Form + Zod Validation Pattern

Form components use React Hook Form with Zod schema validation via `@hookform/resolvers/zod`.

## Problem

Manual `useState` per field + custom `validate()` functions create verbose, error-prone forms. Dirty tracking, error display, and validation logic must all be hand-wired.

## Solution

### 1. Validation schema (`lib/validations/<domain>.validation.ts`)

```ts
import { z } from "zod";
import { FIELD_MIN, FIELD_MAX } from "@journey-os/types";

export const myFormSchema = z.object({
  required_field: z.string().min(FIELD_MIN).max(FIELD_MAX),
  optional_field: z.string().max(FIELD_MAX),  // NOT .optional().default("")
});

export type MyFormValues = z.infer<typeof myFormSchema>;
```

**Critical**: Do NOT use `.optional().default("")` on Zod fields. This creates divergent input/output types (`string | undefined` vs `string`) that cause TS2322 with `zodResolver`. Use plain `.string()` validators and provide defaults via RHF's `defaultValues`.

### 2. Form component

```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { myFormSchema, type MyFormValues } from "@web/lib/validations/my.validation";

export function MyForm({ initialData }: { initialData: Data }) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isDirty },
  } = useForm<MyFormValues>({
    resolver: zodResolver(myFormSchema),
    defaultValues: {
      required_field: initialData.required_field ?? "",
      optional_field: initialData.optional_field ?? "",
    },
  });

  const onSubmit = async (data: MyFormValues) => {
    // data is fully validated and typed
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("required_field")} />
      {errors.required_field && <p>{errors.required_field.message}</p>}

      <button type="submit" disabled={!isDirty}>Save</button>
    </form>
  );
}
```

### 3. Key features from RHF

- `register("field")` — wires onChange/onBlur/ref automatically
- `isDirty` — tracks if form differs from `defaultValues` (replaces manual dirty check)
- `errors` — populated by Zod resolver with `.message` from schema
- `watch("field")` — subscribe to live field value (e.g., for char counters)
- `handleSubmit(onSubmit)` — validates before calling onSubmit

## When to Use

- Any form with 2+ fields that needs client-side validation
- Forms where `isDirty` tracking matters (save button enable/disable)
- Forms with validation rules matching server-side constants from `@journey-os/types`

## When NOT to Use

- Single-field inline edits (a simple `useState` + `onChange` is fine)
- Server-only validation without client-side feedback

## Packages

```bash
pnpm add react-hook-form @hookform/resolvers zod
```

Installed in `apps/web` as of STORY-F-5.
