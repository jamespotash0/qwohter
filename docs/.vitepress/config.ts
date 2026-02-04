import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Qwohter Docs',
  description: 'Developer documentation for Qwohter — proposal and quote management platform',

  themeConfig: {
    nav: [
      { text: 'Architecture', link: '/architecture/AUTH' },
      { text: 'Features', link: '/features/PROPOSALS' },
      { text: 'Guides', link: '/guides/NEW_FEATURE_GUIDE' },
      { text: 'Reference', link: '/reference/ENVIRONMENT' },
    ],

    sidebar: [
      {
        text: 'Architecture',
        collapsed: false,
        items: [
          { text: 'Authentication', link: '/architecture/AUTH' },
          { text: 'Database', link: '/architecture/DATABASE' },
          { text: 'Security', link: '/architecture/SECURITY' },
          { text: 'State Management', link: '/architecture/STATE_MANAGEMENT' },
          { text: 'Observability', link: '/architecture/OBSERVABILITY' },
        ],
      },
      {
        text: 'Features',
        collapsed: false,
        items: [
          { text: 'Proposals', link: '/features/PROPOSALS' },
          { text: 'Forms & Form Builder', link: '/features/FORMS' },
          { text: 'Projects & Board', link: '/features/PROJECTS' },
          { text: 'Contacts', link: '/features/CONTACTS' },
          { text: 'Billing & Subscriptions', link: '/features/BILLING' },
          { text: 'Notifications', link: '/features/NOTIFICATIONS' },
          { text: 'Settings', link: '/features/SETTINGS' },
          { text: 'Admin Panel', link: '/features/ADMIN' },
          { text: 'Google Integration', link: '/features/GOOGLE_INTEGRATION' },
          { text: 'Wall System Config', link: '/features/WALL_SYSTEM_CONFIG_RULES' },
        ],
      },
      {
        text: 'Guides',
        collapsed: false,
        items: [
          { text: 'New Feature Guide', link: '/guides/NEW_FEATURE_GUIDE' },
          { text: 'Local Development', link: '/guides/LOCAL_DEV' },
          { text: 'Testing', link: '/guides/TESTING' },
          { text: 'Edge Functions', link: '/guides/EDGE_FUNCTIONS' },
          { text: 'Google RISC Setup', link: '/guides/GOOGLE_RISC_SETUP' },
          { text: 'Resend SMTP Setup', link: '/guides/RESEND_SMTP_SETUP' },
        ],
      },
      {
        text: 'Reference',
        collapsed: false,
        items: [
          { text: 'Environment Variables', link: '/reference/ENVIRONMENT' },
          { text: 'Landing Page', link: '/reference/LANDING_PAGE' },
        ],
      },
      {
        text: 'Plans',
        collapsed: true,
        items: [
          { text: 'Client Portal Plan', link: '/plans/CLIENT_PORTAL_PLAN' },
        ],
      },
    ],

    search: {
      provider: 'local',
    },

    outline: {
      level: [2, 3],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com' },
    ],
  },
})
