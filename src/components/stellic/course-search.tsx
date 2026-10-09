import { cn } from "cn"

import { Icon } from "@/components/icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { CatalogEntry } from "@/data/catalog"

/* Looking for a course to put somewhere: the search that was run, and what it
 * found. Opened from a seat it lists what could fill that seat; opened from a
 * term it lists what the plan still wants. Two cards on the grey ground every
 * panel of this kind stands on. */

/** A course as the search lists it: the handle it would be dragged by, its
 *  code and its name. The name wraps rather than truncating — the frame's rows
 *  grow to two lines and several of them do. */
export function CourseRow({
  code,
  name,
  onOpen,
}: {
  code: string
  name: string
  /** Opens the course on its own. */
  onOpen?: () => void
}) {
  return (
    <div
      onClick={onOpen}
      className={cn(
        "flex w-full cursor-grab items-center gap-2 rounded-md border border-gray-40 bg-card p-[7px]",
        onOpen && "cursor-pointer transition-colors hover:bg-gray-0"
      )}
    >
      <Icon name="drag-indicator" size={16} className="shrink-0 text-gray-100" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-body-md text-gray-80">{code}</span>
        <span className="text-body-md font-semibold text-foreground">{name}</span>
      </span>
    </div>
  )
}

/** The search itself: what it was run with, and what it turned up. */
export function CourseSearch({
  entries,
  onOpenCourse,
  bare,
}: {
  entries: CatalogEntry[]
  onOpenCourse?: (entry: CatalogEntry) => void
  /** Inside a sidebar that heads itself: no search card of its own, and the
   *  results on the sidebar's white rather than on a card. */
  bare?: boolean
}) {
  return (
    <>
      {/* The search that produced this. In a working planner the count is the
          filters it was run with and the chevron folds them open; here it is
          what it says it is. */}
      {!bare && (
        <div className="flex w-full shrink-0 items-center gap-2 rounded-md bg-card p-6 shadow-sm">
          <h2 className="text-caption-lg font-semibold text-foreground">Course Search</h2>
          <Badge variant="secondary">3</Badge>
          <Icon name="expand-less" size={16} className="text-gray-100" />
        </div>
      )}

      <div
        className={cn(
          "flex w-full flex-col gap-2",
          !bare && "rounded-md bg-card p-6 shadow-sm"
        )}
      >
        <div className="flex h-9 w-full items-center justify-between gap-2">
          <h3 className="min-w-0 truncate text-h300 font-semibold text-gray-100">
            {entries.length} Course{entries.length === 1 ? "" : "s"}
          </h3>
          <span className="flex shrink-0 items-center gap-2">
            <Button size="icon" aria-label="Sort">
              <Icon name="unfold-more" size={16} />
            </Button>
            {/* Cards or a plain list, the way the term view switches between
                its own two. Only the one is drawn. */}
            <Tabs value="cards">
              <TabsList>
                <TabsTrigger value="cards" aria-label="Cards">
                  <Icon name="grid-view" size={16} />
                </TabsTrigger>
                <TabsTrigger value="list" aria-label="List">
                  <Icon name="list" size={16} />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </span>
        </div>

        {entries.map((entry, i) => (
          <CourseRow
            key={`${entry.code}-${i}`}
            code={entry.code}
            name={entry.name}
            onOpen={onOpenCourse && (() => onOpenCourse(entry))}
          />
        ))}
      </div>
    </>
  )
}

/** The search as a sidebar of its own, headed the way the course sidebar is:
 *  "Course Search" in the bar beside the close, with a way back above it where
 *  there is somewhere to go back to — a placeholder's own view. Opened from a
 *  term on the plan there is nothing behind it but the plan. Below the bar,
 *  the filters it was run with, then the results on the sidebar's white. */
export function CourseSearchPanel({
  entries,
  backLabel,
  onOpenCourse,
  onBack,
  onClose,
}: {
  entries: CatalogEntry[]
  /** What the way back is to, where there is one. */
  backLabel?: string
  onOpenCourse?: (entry: CatalogEntry) => void
  onBack?: () => void
  onClose: () => void
}) {
  return (
    <aside className="flex h-full w-full flex-col overflow-x-clip overflow-y-auto bg-card pb-28">
      <div className="flex w-full shrink-0 items-start gap-2 border-b border-gray-40 px-6 py-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {backLabel && (
            <button
              type="button"
              onClick={onBack}
              className="mb-1 flex w-fit min-w-0 cursor-pointer items-center gap-1 text-label-md font-medium text-gray-80"
            >
              <Icon name="chevron-left" size={14} className="shrink-0" />
              <span className="min-w-0 truncate text-left">Back to {backLabel}</span>
            </button>
          )}
          <h2 className="text-h400 font-semibold text-gray-100">Course Search</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close course search"
          className="-mt-1.5 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-gray-100 hover:bg-gray-5"
        >
          <Icon name="close" size={20} />
        </button>
      </div>
      <div className="flex w-full flex-col gap-4 px-6 pt-4">
        {/* What the search was run with. In a working planner the chevron
            opens the filters; here it is what it says it is. */}
        <p className="flex items-center gap-2 text-caption-md font-medium text-gray-100">
          <Icon name="filter-alt" size={16} className="shrink-0" />
          Filters
          <Badge variant="secondary">3</Badge>
          <Icon name="chevron-right" size={16} className="shrink-0" />
        </p>
        <CourseSearch entries={entries} onOpenCourse={onOpenCourse} bare />
      </div>
    </aside>
  )
}
