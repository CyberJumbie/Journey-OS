import * as React from "react";

import { cn } from "./utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-[--ink] placeholder:text-[--text-muted] selection:bg-[--blue-mid] selection:text-white border-[--border-default] flex h-[42px] w-full min-w-0 rounded-[--radius-md] border px-[14px] py-[11px] text-[15px] font-sans bg-white transition-[border-color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-[--border-focus] focus-visible:outline focus-visible:outline-[1.5px] focus-visible:outline-[--border-focus] focus-visible:outline-offset-0",
        "aria-invalid:border-[--danger] aria-invalid:focus-visible:outline-[--danger]",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
