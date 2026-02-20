import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-[--radius-sm] px-[10px] py-[3px] text-[10px] font-mono font-medium uppercase tracking-[0.06em] w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-[color,background-color] overflow-hidden border-none",
  {
    variants: {
      variant: {
        // Status badge variants (MSM semantic colors)
        default:
          "bg-[--navy-deep]/8 text-[--navy-deep]",
        success:
          "bg-[--success-bg] text-[--green-dark]",
        warning:
          "bg-[--warning-bg] text-[#8a7a10]",
        danger:
          "bg-[--danger-bg] text-[#8a2c0a]",
        info:
          "bg-[--info-bg] text-[--navy]",
        secondary:
          "bg-[--cream] text-[--text-muted]",
        // Persona tag variants
        faculty:
          "bg-[--green]/8 text-[--green-dark]",
        admin:
          "bg-[--blue]/8 text-[--navy-deep]",
        advisor:
          "bg-[--blue-light]/8 text-[--navy]",
        student:
          "bg-[--blue-mid]/8 text-[--navy-deep]",
        outline:
          "border border-[--border-default] text-[--text-secondary] bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
