// Inline error next to the form/control it belongs to; use instead of destructive toasts.
import { AlertCircle } from "lucide-react";

export const InlineError = ({ message, className = "" }: { message?: string | null; className?: string }) =>
  message ? (
    <p role="alert" className={`flex items-start gap-1.5 text-sm text-destructive ${className}`}>
      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
      <span>{message}</span>
    </p>
  ) : null;
