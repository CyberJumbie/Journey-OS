import { cn } from "./utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-[--cream] animate-pulse rounded-[--radius-md]", className)}
      {...props}
    />
  );
}

export { Skeleton };
