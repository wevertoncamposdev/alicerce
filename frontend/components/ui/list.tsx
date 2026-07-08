import * as React from "react"

import { cn } from "@/lib/utils"

export interface ListProps extends React.HTMLAttributes<HTMLUListElement> {
  children: React.ReactNode
}

const List = React.forwardRef<HTMLUListElement, ListProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <ul
        ref={ref}
        className={cn(
          "bg-white rounded-xl shadow divide-y divide-zinc-100 overflow-hidden",
          className
        )}
        {...props}
      >
        {children}
      </ul>
    )
  }
)
List.displayName = "List"

export { List }
