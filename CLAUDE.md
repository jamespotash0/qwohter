# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run build:dev` - Build in development mode
- `npm run lint` - Run ESLint to check code quality
- `npm run preview` - Preview production build locally

## Architecture Overview

This is a React-based quote generation system built for wall/partition installations, using modern web technologies:


**Tech Stack:**
- React 18 + TypeScript
- Vite for build tooling
- Tailwind CSS + shadcn/ui components
- Supabase for backend (auth, database)
- TanStack Query for data fetching
- React Router for navigation

**Core Structure:**
```
src/
├── components/          # UI components and forms
│   ├── ui/             # shadcn/ui base components
│   └── [forms/dialogs] # Quote-specific components
├── pages/              # Route components (Dashboard, Quotes, etc.)
├── templates/          # Quote PDF generation templates
├── hooks/              # Custom React hooks for data fetching
├── integrations/       # External service integrations (Supabase)
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

**Key Architectural Patterns:**

1. **Template Factory Pattern**: The `TemplateFactory` class dynamically selects appropriate quote templates (Operable Wall, Glass Wall, Accordion Partitions) based on wall system type.

2. **Form-Driven Architecture**: Quote creation flows through multi-step forms that build up a complex quote object with sections for:
   - Wall specifications (dimensions, materials, finishes)
   - Job details (contact info, delivery)
   - Pricing and labor
   - Support structures and pocket doors

3. **Supabase Integration**: 
   - Database schema includes `organizations`, `profiles`, and `quotes` tables
   - Custom functions for role-based access control
   - JSON storage for complex quote data structures

4. **Multi-tenant Organization System**: Users belong to organizations with role-based permissions (admin roles can manage members).

5. **Quote Data Model**: Complex nested structure stored as JSON with strongly-typed interfaces in `src/types/quote.ts`. Wall specifications support multiple wall system types with conditional fields.


## 🔄 Frontend–Backend Sync Requirements <!-- DO NOT DELETE -->

> 📌 Claude must follow these rules when making changes to frontend forms, types, or data flows:

1. **Always Ensure Backend Alignment**:
   - When adding or modifying form fields or UI components in the frontend,
   - Claude must update corresponding:
     - TypeScript interfaces (e.g., `Quote`, `WallSpec`) in `src/types/`
     - JSON structure in Supabase `quotes` table
     - Any Supabase `functions`, `triggers`, or `row-level security` (if relevant)

2. **Reflect Changes in Schema and Docs**:
   - Update this file or a separate schema.md file with any new fields
   - Note whether fields are optional/required, include data types and default values

3. **Validate and Test**:
   - Ensure new fields are validated in the frontend and backend
   - Provide examples or test data if adding new wall system types or configurations

4. **Use Feature Flags for Experimental Changes** (optional):
   - Wrap experimental UI/backend features in a toggle for safe rollout

## Working Directory

The main application code is located in `/wall-quote-wizard/` subdirectory. Always work from this directory for npm commands and file operations.

## Database Schema

Uses Supabase with three main tables:
- `organizations` - Company/org management
- `profiles` - User profiles linked to organizations  
- `quotes` - Quote data stored as JSON with metadata

Custom functions handle organization-based access control and member management.