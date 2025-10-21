import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm placeholder:text-foreground focus:outline-none focus:ring-1 focus:ring-[var(--brand-orange-600)] focus:border-[var(--brand-orange-600)] disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50 disabled:border-gray-200 dark:disabled:bg-gray-900 dark:disabled:border-gray-700 [&>span]:line-clamp-1",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
