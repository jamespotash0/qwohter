import { Moon, Sun, Monitor, Lock } from "@phosphor-icons/react";

export function AppearanceTab() {
  const themes = [
    {
      id: "light",
      label: "Light",
      icon: Sun,
      isActive: true,
      isLocked: false,
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
    },
    {
      id: "dark",
      label: "Dark",
      icon: Moon,
      isActive: false,
      isLocked: true,
      preview: (
        <div className="w-full h-32 rounded-lg bg-[#1C1E26] border border-gray-700 p-3 flex flex-col gap-2 opacity-50">
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
      isActive: false,
      isLocked: true,
      preview: (
        <div className="w-full h-32 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-300 p-3 flex flex-col gap-2 relative overflow-hidden opacity-50">
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
    }
  ];

  return (
    <div className="w-full max-w-5xl min-w-[640px]">
      {/* Theme Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Appearance</h2>
        <div className="h-px bg-gray-200 dark:bg-gray-700 mb-6"></div>

        <div className="max-w-4xl">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Theme</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Select your default theme</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {themes.map((t) => {
              const Icon = t.icon;

              return (
                <div
                  key={t.id}
                  className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all relative ${
                    t.isActive
                      ? 'border-[var(--sidebar-icon-active)] bg-[var(--sidebar-nav-bg-active)]'
                      : 'border-gray-200 dark:border-gray-700 cursor-not-allowed'
                  }`}
                >
                  {/* Lock badge for coming soon themes */}
                  {t.isLocked && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-xs text-gray-500 dark:text-gray-400">
                      <Lock className="w-3 h-3" weight="fill" />
                      <span>Coming soon</span>
                    </div>
                  )}
                  {t.preview}
                  <div className="flex items-center gap-2">
                    <Icon
                      className={`w-4 h-4 ${t.isLocked ? 'text-gray-400' : ''}`}
                      weight={t.isActive ? 'fill' : 'regular'}
                    />
                    <span className={`text-sm font-medium ${
                      t.isActive
                        ? 'text-[var(--sidebar-icon-active)]'
                        : 'text-gray-400'
                    }`}>
                      {t.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Accent Color Section - Future feature */}
      <div className="mb-8 max-w-4xl">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Accent Color</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Choose your accent color</p>
        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">Coming soon</p>
        </div>
      </div>
    </div>
  );
}
