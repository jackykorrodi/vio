import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--violet)]/30 aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "rounded-full bg-[var(--violet)] text-white text-[15px] font-bold font-[family-name:var(--font-display)] hover:bg-[var(--violet-light)] shadow-[0_6px_24px_rgba(107,79,187,0.30)]",
        destructive:
          "rounded-md bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20",
        outline:
          "rounded-md border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground",
        secondary:
          "rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "rounded-md text-[var(--violet)] hover:bg-[var(--violet-xpale)]",
        link:
          "text-[var(--violet)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-7 py-2.5 has-[>svg]:px-5",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 px-4 has-[>svg]:px-3 text-sm",
        lg: "h-12 px-8 text-base",
        nav: "text-[13px] px-[26px] py-[11px] font-bold font-[family-name:var(--font-display)]",
        icon: "size-9 rounded-full",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-full",
        "icon-lg": "size-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
