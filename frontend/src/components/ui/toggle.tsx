"use client";

import * as React from "react";
import * as TogglePrimitive from "@radix-ui/react-toggle";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const toggleVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[--radius-md] text-[14px] font-sans font-medium hover:bg-[--parchment] hover:text-[--ink] disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-[--navy-deep] data-[state=on]:text-white [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 focus-visible:outline focus-visible:outline-[1.5px] focus-visible:outline-[--border-focus] focus-visible:outline-offset-2 outline-none transition-all aria-invalid:border-[--danger] whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline:
          "border border-[--border-default] bg-transparent hover:bg-[--parchment] hover:text-[--ink]",
      },
      size: {
        default: "h-10 px-3 min-w-10",
        sm: "h-9 px-2 min-w-9",
        lg: "h-11 px-4 min-w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Toggle({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Toggle, toggleVariants };
