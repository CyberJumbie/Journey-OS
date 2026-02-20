import * as React from "react";

import { cn } from "./utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "resize-none border-[--border-default] placeholder:text-[--text-muted] focus-visible:border-[--border-focus] focus-visible:outline focus-visible:outline-[1.5px] focus-visible:outline-[--border-focus] focus-visible:outline-offset-0 aria-invalid:border-[--danger] aria-invalid:focus-visible:outline-[--danger] flex field-sizing-content min-h-16 w-full rounded-[--radius-md] border bg-white px-[14px] py-[11px] text-[15px] font-sans transition-[border-color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
