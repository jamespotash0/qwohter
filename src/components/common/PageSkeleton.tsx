import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route-specific skeleton loading states for lazy-loaded pages.
 * Used as Suspense fallback inside MainLayout so the sidebar stays visible
 * while only the content area shows a skeleton matching the target page's layout.
 */

/** Proposals: 4 stat cards + table with toolbar */
const ProposalsSkeleton = () => (
  <div className="space-y-6 animate-in fade-in duration-200">
    {/* Header */}
    <div className="space-y-1">
      <Skeleton className="h-8 w-36" />
      <Skeleton className="h-4 w-72" />
    </div>

    {/* Stats cards row */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4 rounded-lg border border-border/40">
          <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-12" />
          </div>
        </div>
      ))}
    </div>

    {/* Table toolbar */}
    <div className="flex items-center justify-between gap-4">
      <Skeleton className="h-9 w-64 rounded-md" />
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>
    </div>

    {/* Table rows */}
    <div className="space-y-2">
      <Skeleton className="h-10 w-full rounded-md" />
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-md" />
      ))}
    </div>
  </div>
);

/** Forms: search bar + card grid */
const FormsSkeleton = () => (
  <div className="space-y-6 animate-in fade-in duration-200">
    {/* Header with action buttons */}
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-20 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
    </div>

    {/* Search bar */}
    <div className="flex items-center gap-3">
      <Skeleton className="h-9 flex-1 max-w-md rounded-md" />
      <Skeleton className="h-9 w-9 rounded-md" />
    </div>

    {/* Card grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border/40 overflow-hidden">
          <Skeleton className="h-3 w-full rounded-none" />
          <div className="p-4 space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

/** Board / TaskBoard: kanban columns with cards */
const KanbanSkeleton = () => (
  <div className="space-y-6 animate-in fade-in duration-200">
    {/* Header */}
    <div className="space-y-1">
      <Skeleton className="h-8 w-36" />
      <Skeleton className="h-4 w-64" />
    </div>

    {/* Kanban columns */}
    <div className="flex gap-4 overflow-hidden pt-2">
      {Array.from({ length: 4 }).map((_, col) => (
        <div key={col} className="w-72 shrink-0 rounded-lg border border-border/40 bg-muted/20">
          {/* Column color bar */}
          <Skeleton className="h-1.5 w-full rounded-none rounded-t-lg" />
          {/* Column header */}
          <div className="flex items-center justify-between px-3 py-2.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-5 rounded-full" />
          </div>
          {/* Cards */}
          <div className="space-y-2 px-2 pb-3">
            {Array.from({ length: col === 0 ? 3 : col === 1 ? 4 : col === 2 ? 2 : 3 }).map((_, card) => (
              <div key={card} className="rounded-md border border-border/30 bg-background p-3 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex items-center justify-between pt-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-5 w-5 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

/** Contacts: search/filter toolbar + table */
const ContactsSkeleton = () => (
  <div className="space-y-6 animate-in fade-in duration-200">
    {/* Header */}
    <div className="space-y-1">
      <Skeleton className="h-8 w-28" />
      <Skeleton className="h-4 w-64" />
    </div>

    {/* Toolbar */}
    <div className="flex items-center gap-3">
      <Skeleton className="h-9 flex-1 max-w-sm rounded-md" />
      <Skeleton className="h-9 w-28 rounded-md" />
      <Skeleton className="h-9 w-32 rounded-md" />
    </div>

    {/* Table */}
    <div className="space-y-2">
      <Skeleton className="h-10 w-full rounded-md" />
      {Array.from({ length: 7 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-md" />
      ))}
    </div>
  </div>
);

/** Calendar: nav header + calendar grid */
const CalendarSkeleton = () => (
  <div className="space-y-4 animate-in fade-in duration-200">
    {/* Header with action button */}
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-4 w-56" />
      </div>
      <Skeleton className="h-9 w-28 rounded-lg" />
    </div>

    {/* Calendar navigation */}
    <div className="flex items-center justify-between">
      <Skeleton className="h-8 w-8 rounded-md" />
      <Skeleton className="h-6 w-40" />
      <div className="flex gap-1">
        <Skeleton className="h-8 w-16 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-8 w-14 rounded-md" />
        <Skeleton className="h-8 w-14 rounded-md" />
        <Skeleton className="h-8 w-16 rounded-md" />
        <Skeleton className="h-8 w-14 rounded-md" />
      </div>
    </div>

    {/* Day headers */}
    <div className="grid grid-cols-7 gap-px">
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((_, i) => (
        <div key={i} className="text-center py-2">
          <Skeleton className="h-4 w-8 mx-auto" />
        </div>
      ))}
    </div>

    {/* Calendar grid — 5 rows */}
    <div className="grid grid-cols-7 gap-px border border-border/30 rounded-lg overflow-hidden">
      {Array.from({ length: 35 }).map((_, i) => (
        <div key={i} className="h-24 p-2 border border-border/20 bg-background">
          <Skeleton className="h-4 w-6 mb-2" />
          {i % 5 === 1 && <Skeleton className="h-4 w-full rounded-sm" />}
          {i % 7 === 3 && <Skeleton className="h-4 w-3/4 rounded-sm" />}
        </div>
      ))}
    </div>
  </div>
);

/** Default fallback skeleton for unrecognized routes */
const DefaultSkeleton = () => (
  <div className="space-y-6 animate-in fade-in duration-200">
    <div className="space-y-1">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-4 w-64" />
    </div>
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-lg" />
      ))}
    </div>
  </div>
);

/**
 * Returns the appropriate skeleton component for the given route.
 * Called by MainLayout's Suspense fallback.
 */
export const getPageSkeleton = (pathname: string) => {
  if (pathname.startsWith('/proposals') || pathname.startsWith('/proposal')) return <ProposalsSkeleton />;
  if (pathname.startsWith('/forms') || pathname.startsWith('/form-builder')) return <FormsSkeleton />;
  if (pathname.startsWith('/board')) return <KanbanSkeleton />;
  if (pathname.startsWith('/task-board')) return <KanbanSkeleton />;
  if (pathname.startsWith('/contacts')) return <ContactsSkeleton />;
  if (pathname.startsWith('/calendar')) return <CalendarSkeleton />;
  return <DefaultSkeleton />;
};

/** Re-export for backwards compatibility with MainLayout import */
export const PageSkeleton = DefaultSkeleton;
