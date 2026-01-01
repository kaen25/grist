import * as React from "react"
import { GripVerticalIcon, GripHorizontalIcon } from "lucide-react"
import {
  Group as ResizablePrimitiveGroup,
  Panel as ResizablePrimitivePanel,
  Separator as ResizablePrimitiveSeparator,
  type GroupProps,
} from "react-resizable-panels"

import { cn } from "@/lib/utils"

const ResizableContext = React.createContext<{ direction: "horizontal" | "vertical" }>({ direction: "horizontal" })

type ResizablePanelGroupProps = Omit<GroupProps, "orientation"> & {
  direction?: "horizontal" | "vertical"
}

function ResizablePanelGroup({
  className,
  direction = "horizontal",
  ...props
}: ResizablePanelGroupProps) {
  return (
    <ResizableContext.Provider value={{ direction }}>
      <ResizablePrimitiveGroup
        data-slot="resizable-panel-group"
        className={cn(
          "flex h-full w-full",
          direction === "vertical" && "flex-col",
          className
        )}
        orientation={direction}
        {...props}
      />
    </ResizableContext.Provider>
  )
}

function ResizablePanel({
  ...props
}: React.ComponentProps<typeof ResizablePrimitivePanel>) {
  return <ResizablePrimitivePanel data-slot="resizable-panel" {...props} />
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitiveSeparator> & {
  withHandle?: boolean
}) {
  const { direction } = React.useContext(ResizableContext)
  const isVertical = direction === "vertical"

  return (
    <ResizablePrimitiveSeparator
      data-slot="resizable-handle"
      className={cn(
        "bg-border focus-visible:ring-ring relative flex items-center justify-center focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:outline-hidden",
        isVertical
          ? "h-px w-full after:absolute after:inset-x-0 after:top-1/2 after:h-1 after:-translate-y-1/2"
          : "w-px after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2",
        className
      )}
      {...props}
    >
      {withHandle && (
        <div className={cn(
          "bg-border z-10 flex items-center justify-center rounded-xs border",
          isVertical ? "h-3 w-4" : "h-4 w-3"
        )}>
          {isVertical ? (
            <GripHorizontalIcon className="size-2.5" />
          ) : (
            <GripVerticalIcon className="size-2.5" />
          )}
        </div>
      )}
    </ResizablePrimitiveSeparator>
  )
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
