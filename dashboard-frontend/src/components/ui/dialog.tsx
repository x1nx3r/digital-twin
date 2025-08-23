"use client"

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

const Dialog: React.FC<DialogProps> = ({ children }) => {
  return <>{children}</>;
}

const DialogTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ children, ...props }, ref) => (
  <button ref={ref} {...props}>
    {children}
  </button>
))
DialogTrigger.displayName = "DialogTrigger"

const DialogContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    onClose?: () => void;
  }
>(({ className, children, onClose, ...props }, ref) => (
  <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
    <div
      ref={ref}
      className={cn(
        "relative bg-white rounded-lg shadow-lg max-w-lg w-full max-h-[90vh] overflow-auto p-6",
        className
      )}
      {...props}
    >
      {children}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
      )}
    </div>
  </div>
))
DialogContent.displayName = "DialogContent"

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left mb-4",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = "DialogDescription"

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
