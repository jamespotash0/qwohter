import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      closeButton
      duration={4000}
      visibleToasts={5}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white dark:group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-lg",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-sm",
          actionButton:
            "group-[.toast]:!bg-emerald-500 group-[.toast]:!text-white group-[.toast]:!font-medium group-[.toast]:!rounded group-[.toast]:!px-3 group-[.toast]:!py-1.5 group-[.toast]:!text-xs group-[.toast]:hover:!bg-emerald-600 group-[.toast]:!transition-colors group-[.toast]:!border-0",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded",
          closeButton:
            "group-[.toast]:absolute group-[.toast]:right-2 group-[.toast]:top-2 group-[.toast]:flex group-[.toast]:items-center group-[.toast]:justify-center group-[.toast]:w-6 group-[.toast]:h-6 group-[.toast]:rounded-full group-[.toast]:bg-gray-800 group-[.toast]:text-white dark:group-[.toast]:bg-gray-700 dark:group-[.toast]:text-white group-[.toast]:hover:bg-gray-900 dark:group-[.toast]:hover:bg-gray-600 group-[.toast]:transition-all group-[.toast]:duration-200 group-[.toast]:focus:ring-2 group-[.toast]:focus:ring-ring group-[.toast]:focus:outline-none",
          warning: "group-[.toaster]:!border-l-4 group-[.toaster]:!border-l-amber-500",
          error: "group-[.toaster]:!border-l-4 group-[.toaster]:!border-l-red-500",
          success: "group-[.toaster]:!border-l-4 group-[.toaster]:!border-l-emerald-500",
        },
        unstyled: false,
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
