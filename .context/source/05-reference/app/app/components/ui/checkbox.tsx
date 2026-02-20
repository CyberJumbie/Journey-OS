"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { CheckIcon } from "lucide-react";

import { cn } from "./utils";

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer border border-[--border-default] bg-white data-[state=checked]:bg-[--navy-deep] data-[state=checked]:text-white data-[state=checked]:border-[--navy-deep] focus-visible:outline focus-visible:outline-[1.5px] focus-visible:outline-[--border-focus] focus-visible:outline-offset-2 aria-invalid:border-[--danger] size-4 shrink-0 rounded-[--radius-sm] shadow-none transition-all disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current transition-none"
      >
        <CheckIcon className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };