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
            "group toast group-[.toaster]:bg-white dark:group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          closeButton:
            "group-[.toast]:absolute group-[.toast]:right-2 group-[.toast]:top-2 group-[.toast]:flex group-[.toast]:items-center group-[.toast]:justify-center group-[.toast]:w-6 group-[.toast]:h-6 group-[.toast]:rounded-full group-[.toast]:bg-muted/80 group-[.toast]:text-white dark:group-[.toast]:text-white group-[.toast]:hover:bg-muted group-[.toast]:hover:text-white group-[.toast]:transition-all group-[.toast]:duration-200 group-[.toast]:focus:ring-2 group-[.toast]:focus:ring-ring group-[.toast]:focus:outline-none",
        },
        unstyled: false,
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
