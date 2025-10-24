import { Moon, Sun, Monitor } from "@phosphor-icons/react";
import { useTheme } from "@/contexts/ThemeContext";

export function AppearanceTab() {
  const { theme, setTheme } = useTheme();

  const themes = [
    {
      id: "dark",
      label: "Dark",
      icon: Moon,
      preview: (
        <div className="w-full h-32 rounded-lg bg-[#1C1E26] border border-gray-700 p-3 flex flex-col gap-2">
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
          </div>
          <div className="flex-1 bg-[#252834] rounded"></div>
        </div>
      )
    },
    {
      id: "system",
      label: "System Default",
      icon: Monitor,
      preview: (
        <div className="w-full h-32 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-300 p-3 flex flex-col gap-2 relative overflow-hidden">
          <div className="absolute inset-0 flex">
            <div className="w-1/2 bg-[#1C1E26]"></div>
            <div className="w-1/2 bg-white"></div>
          </div>
          <div className="relative flex gap-1 z-10">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
          </div>
        </div>
      )
    },
    {
      id: "light",
      label: "Light",
      icon: Sun,
      preview: (
        <div className="w-full h-32 rounded-lg bg-white border border-gray-300 p-3 flex flex-col gap-2">
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
          </div>
          <div className="flex-1 bg-gray-100 rounded"></div>
        </div>
      )
    }
  ];

  return (
    <div className="max-w-3xl">
      {/* Theme Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Appearance</h2>
        <div className="h-px bg-gray-200 dark:bg-gray-700 mb-6"></div>

        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Theme</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Select your default theme</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {themes.map((t) => {
              const Icon = t.icon;
              const isSelected = theme === t.id;

              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id as 'light' | 'dark' | 'system')}
                  className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    isSelected
                      ? 'border-[var(--sidebar-icon-active)] bg-[var(--sidebar-nav-bg-active)]'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {t.preview}
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" weight={isSelected ? 'fill' : 'regular'} />
                    <span className={`text-sm font-medium ${
                      isSelected ? 'text-[var(--sidebar-icon-active)]' : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {t.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Accent Color Section - Future feature */}
      <div className="mb-8">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Accent Color</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Choose your accent color</p>
        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">Coming soon</p>
        </div>
      </div>
    </div>
  );
}
