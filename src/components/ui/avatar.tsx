import * as React from "react";
import { cn } from "@/lib/utils";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  initials: string;
  variant?: "navy" | "coral" | "muted";
  size?: "sm" | "md" | "lg";
}

const sizes = { sm: "w-7 h-7 text-xs", md: "w-10 h-10 text-sm", lg: "w-16 h-16 text-xl" };
const variants = {
  navy:  "bg-primary text-primary-foreground",
  coral: "bg-accent text-accent-foreground",
  muted: "bg-muted text-muted-foreground",
};

export function Avatar({ initials, variant = "navy", size = "md", className, ...props }: AvatarProps) {
  return (
    <div
      className={cn("rounded-full inline-flex items-center justify-center font-semibold flex-shrink-0", sizes[size], variants[variant], className)}
      {...props}
    >
      {initials}
    </div>
  );
}
