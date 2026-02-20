import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-sans text-[15px] font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:outline focus-visible:outline-[1.5px] focus-visible:outline-[--border-focus] focus-visible:outline-offset-2",
  {
    variants: {
      variant: {
        // Primary - Navy deep background, white text
        default: "bg-[--navy-deep] text-white hover:bg-[--blue] active:bg-[--navy] rounded-[--radius-md] shadow-none",
        // Destructive - Danger color
        destructive:
          "bg-[--danger] text-white hover:bg-[#a84521] active:bg-[#8a3519] rounded-[--radius-md] shadow-none",
        // Outline - Transparent with border
        outline:
          "border-[1.5px] border-[--border-default] bg-transparent text-[--navy-deep] hover:border-[--blue-mid] hover:text-[--blue] rounded-[--radius-md] shadow-none",
        // Secondary - Cream background
        secondary:
          "bg-[--cream] text-[--navy-deep] hover:bg-[--warm-gray] rounded-[--radius-md] shadow-none",
        // Ghost - Transparent, subtle hover
        ghost:
          "bg-transparent text-[--text-secondary] hover:text-[--navy-deep] hover:bg-[--parchment] rounded-[--radius-md] shadow-none",
        // Link - Text only
        link: "text-[--blue] hover:text-[--navy-deep] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-[42px] px-7 py-[13px] has-[>svg]:px-5",
        sm: "h-[36px] rounded-[--radius-md] gap-1.5 px-5 has-[>svg]:px-4",
        lg: "h-[46px] rounded-[--radius-lg] px-8 has-[>svg]:px-6",
        icon: "size-9 rounded-[--radius-md]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & {
      asChild?: boolean;
    }
>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  );
});

Button.displayName = "Button";

export { Button, buttonVariants };
