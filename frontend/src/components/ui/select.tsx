import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@lib/utils";

// Wrapper em volta do <select> nativo (não é o Select Radix do shadcn) — mesmas
// variantes do Input para ficar visualmente igual a ele no modo de edição inline.
const selectVariants = cva(
  "w-full min-w-0 text-base transition-colors outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
  {
    variants: {
      variant: {
        default:
          "h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:bg-input/50 dark:bg-input/30 dark:disabled:bg-input/80",
        "inline-detail":
          "rounded-none border-0 border-b border-border/70 bg-transparent px-0 py-1.5 shadow-none focus-visible:ring-0 focus-visible:border-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "className">,
    VariantProps<typeof selectVariants> {
  options: { label: string; value: string }[];
  className?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, variant, options, ...props }, ref) => {
    return (
      <select
        ref={ref}
        data-slot="select"
        className={cn(selectVariants({ variant }), className)}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }
);

Select.displayName = "Select";
