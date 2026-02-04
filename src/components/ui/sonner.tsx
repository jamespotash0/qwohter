import { useTheme } from "next-themes"
import { Toaster as Sonner, toast as sonnerToast, type ExternalToast } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      duration={3000}
      visibleToasts={5}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white dark:group-[.toaster]:bg-gray-900 group-[.toaster]:text-gray-900 dark:group-[.toaster]:text-gray-100 group-[.toaster]:border group-[.toaster]:border-gray-200 dark:group-[.toaster]:border-gray-700/60 group-[.toaster]:shadow-md group-[.toaster]:rounded",
          description:
            "group-[.toast]:text-gray-500 dark:group-[.toast]:text-gray-400 group-[.toast]:text-sm",
          actionButton:
            "group-[.toast]:!bg-coral group-[.toast]:!text-white group-[.toast]:!font-medium group-[.toast]:!rounded-md group-[.toast]:!px-3 group-[.toast]:!py-1.5 group-[.toast]:!text-xs group-[.toast]:hover:!bg-coral-dark group-[.toast]:!transition-colors group-[.toast]:!border-0",
          cancelButton:
            "group-[.toast]:!bg-gray-100 dark:group-[.toast]:!bg-gray-700 group-[.toast]:!text-gray-600 dark:group-[.toast]:!text-gray-300 group-[.toast]:!font-medium group-[.toast]:!rounded-md group-[.toast]:!px-3 group-[.toast]:!py-1.5 group-[.toast]:!text-xs group-[.toast]:hover:!bg-gray-200 dark:group-[.toast]:hover:!bg-gray-600 group-[.toast]:!transition-colors group-[.toast]:!border-0",
        },
        unstyled: false,
      }}
      {...props}
    />
  )
}

// Auto-add a "Dismiss" cancel button to every toast
type ToastMessage = string | React.ReactNode
const DISMISS = { label: 'Dismiss' } as const

const toast = Object.assign(
  (message: ToastMessage, options?: ExternalToast) =>
    sonnerToast(message, { cancel: DISMISS, ...options }),
  {
    success: (message: ToastMessage, options?: ExternalToast) =>
      sonnerToast.success(message, { cancel: DISMISS, ...options }),
    error: (message: ToastMessage, options?: ExternalToast) =>
      sonnerToast.error(message, { cancel: DISMISS, ...options }),
    warning: (message: ToastMessage, options?: ExternalToast) =>
      sonnerToast.warning(message, { cancel: DISMISS, ...options }),
    info: (message: ToastMessage, options?: ExternalToast) =>
      sonnerToast.info(message, { cancel: DISMISS, ...options }),
    loading: sonnerToast.loading,
    promise: sonnerToast.promise,
    dismiss: sonnerToast.dismiss,
    custom: sonnerToast.custom,
    message: sonnerToast.message,
  }
)

export { Toaster, toast }
