import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full px-2.5 py-1 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:ring-ring/50 focus-visible:ring-[3px] transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "bg-primary/10 text-primary [a&]:hover:bg-primary/30",
        secondary:
          "bg-secondary/30 text-secondary-foreground [a&]:hover:bg-secondary/40",
        destructive:
          "bg-destructive/10 text-destructive [a&]:hover:bg-destructive/30",
        outline:
          "bg-accent/50 text-foreground [a&]:hover:bg-accent",
        // status variants
        success:
          "bg-emerald-500/10 text-emerald-500",
        warning:
          "bg-amber-500/10 text-amber-500",
        info:
          "bg-sky-500/10 text-sky-500",
        neutral:
          "bg-red-500/10 text-red-500",
        // difficulty variants
        mythic:
          "bg-rose-600/10 text-rose-400",
        heroic:
          "bg-indigo-500/10 text-indigo-500",
        normal:
          "bg-emerald-500/10 text-emerald-500",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
