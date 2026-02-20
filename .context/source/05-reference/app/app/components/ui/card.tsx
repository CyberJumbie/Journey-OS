import * as React from "react";

import { cn } from "./utils";

/**
 * JOURNEY OS CARD SYSTEM — Context-Aware Surface Layering
 * 
 * The One Rule: Cards always contrast their parent.
 * 
 * Parent Surface → Child Card Variant → Background
 * ─────────────────────────────────────────────────────
 * cream         → default           → white
 * white         → elevated          → parchment  
 * parchment     → default           → white
 * navyDeep      → inverted          → rgba(white, 0.06)
 * 
 * Usage:
 * <Card variant="default">  // white bg (default, use on cream)
 * <Card variant="elevated"> // parchment bg (use on white)
 * <Card variant="inverted"> // translucent white (use on navyDeep)
 */

type CardVariant = "default" | "elevated" | "inverted";

interface CardProps extends React.ComponentProps<"div"> {
  variant?: CardVariant;
}

function Card({ 
  className, 
  variant = "default",
  ...props 
}: CardProps) {
  const variantStyles = {
    default: "bg-white text-[--ink] border border-[--border-light] hover:border-[--blue-mid]",
    elevated: "bg-parchment text-[--ink] border border-[--border-light] hover:border-[--blue-mid]",
    inverted: "bg-white/[0.06] text-[--text-on-inverted] border border-white/[0.08] hover:border-white/[0.12] backdrop-blur-sm"
  };

  return (
    <div
      data-slot="card"
      className={cn(
        "flex flex-col gap-6 rounded-[--radius-2xl] transition-all duration-[--duration-normal]",
        variantStyles[variant],
        variant !== "inverted" && "hover:shadow-[--shadow-card]",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 pt-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <h3
      data-slot="card-title"
      className={cn(
        "font-serif text-[--font-size-heading-lg] font-bold leading-[1.3] text-[--navy-deep] tracking-[-0.01em]",
        className
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <p
      data-slot="card-description"
      className={cn(
        "text-[--font-size-body-xs] leading-[1.65] text-[--text-secondary] font-sans",
        className
      )}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6 [&:last-child]:pb-6", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 pb-6 [.border-t]:pt-6", className)}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};

export type { CardVariant };
