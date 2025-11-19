"use client"

import {
  CheckCircle2,
  InfoIcon,
  Loader2Icon,
  TriangleAlertIcon,
  OctagonXIcon,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ position = "top-center", richColors = false, expand = true, ...props }: ToasterProps) => {
  return (
    <Sonner
      position={position}
      richColors={richColors}
      expand={expand}
      closeButton={false}
      className="toaster group"
      icons={{
        success: <CheckCircle2 className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "bg-zinc-100 dark:bg-zinc-900 text-foreground border border-border/60 shadow-lg rounded-2xl px-4 py-2 text-sm flex items-center gap-3",
          title: "text-sm font-medium",
          description: "text-xs text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
