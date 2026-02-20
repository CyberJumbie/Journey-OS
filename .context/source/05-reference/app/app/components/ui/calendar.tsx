"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "./utils";
import { buttonVariants } from "./button";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-2",
        month: "flex flex-col gap-4",
        caption: "flex justify-center pt-1 relative items-center w-full",
        caption_label: "text-[14px] font-sans font-semibold",
        nav: "flex items-center gap-1",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "size-7 bg-transparent p-0 opacity-50 hover:opacity-100",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-x-1",
        head_row: "flex",
        head_cell:
          "text-[--text-muted] rounded-[--radius-md] w-8 font-sans font-normal text-[12px]",
        row: "flex w-full mt-2",
        cell: cn(
          "relative p-0 text-center text-[14px] font-sans focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-[--parchment] [&:has([aria-selected].day-range-end)]:rounded-r-[--radius-md]",
          props.mode === "range"
            ? "[&:has(>.day-range-end)]:rounded-r-[--radius-md] [&:has(>.day-range-start)]:rounded-l-[--radius-md] first:[&:has([aria-selected])]:rounded-l-[--radius-md] last:[&:has([aria-selected])]:rounded-r-[--radius-md]"
            : "[&:has([aria-selected])]:rounded-[--radius-md]",
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "size-8 p-0 font-sans font-normal aria-selected:opacity-100",
        ),
        day_range_start:
          "day-range-start aria-selected:bg-[--navy-deep] aria-selected:text-white",
        day_range_end:
          "day-range-end aria-selected:bg-[--navy-deep] aria-selected:text-white",
        day_selected:
          "bg-[--navy-deep] text-white hover:bg-[--navy-deep] hover:text-white focus:bg-[--navy-deep] focus:text-white",
        day_today: "bg-[--parchment] text-[--ink] font-semibold",
        day_outside:
          "day-outside text-[--text-muted] aria-selected:text-[--text-muted]",
        day_disabled: "text-[--text-muted] opacity-50",
        day_range_middle:
          "aria-selected:bg-[--parchment] aria-selected:text-[--ink]",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ className, ...props }) => (
          <ChevronLeft className={cn("size-4", className)} {...props} />
        ),
        IconRight: ({ className, ...props }) => (
          <ChevronRight className={cn("size-4", className)} {...props} />
        ),
      }}
      {...props}
    />
  );
}

export { Calendar };
