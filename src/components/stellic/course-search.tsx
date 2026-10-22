import { cn } from "cn"
import { useMemo, useState } from "react"

import { Icon } from "@/components/icon"
import { CourseTags, useMetadata } from "@/components/stellic/course-metadata"
import { FilterBar, matches, type FilterState } from "@/components/stellic/filter-bar"
import { PanelTopHeader } from "@/components/stellic/panel-top-header"
import { courseAnswers, courseSearchFilters } from "@/components/stellic/course-search-filters"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { CatalogEntry } from "@/data/catalog"
import { catalogCourse } from "@/data/course-sidebar"
import type { PlannedCourse } from "@/data/plan"

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
  course,
  onOpen,
}: {
  code: string
  /** Left off where Course details has the name switched off. */
  name?: string
  /** What Course details can show of it, drawn as the cards in the plan draw it. */
  course?: PlannedCourse
  /** Opens the course on its own. */
  onOpen?: () => void
}) {
  return (
    <div
      onClick={onOpen}
      className={cn(
        "flex w-full cursor-grab items-center gap-2 rounded-md border border-gray-40 bg-card p-[11px]",
        onOpen && "cursor-pointer transition-colors hover:bg-gray-0"
      )}
    >
      <Icon name="drag-indicator" size={16} className="shrink-0 text-gray-100" />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        {/* Code and name run on in one line, and the name wraps if it has to. */}
        <span className="text-body-md">
          <span className="mr-2 text-gray-100">{code}</span>
          {name && <span className="font-semibold text-foreground">{name}</span>}
        </span>
        {course && <CourseTags course={course} />}
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
  /* What Course details has on, so a result carries what a card in the plan does. */
  const shown = useMetadata()

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
            name={shown.includes("name") ? entry.name : undefined}
            course={catalogCourse(entry)}
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
  credits,
  initialFilters = {},
  onOpenCourse,
  onBack,
  onClose,
}: {
  entries: CatalogEntry[]
  /** What the way back is to, where there is one. */
  backLabel?: string
  /** What the search is for, in credits, where it is for something that has them. */
  credits?: number | string
  /** What the search starts out narrowed to, which the filters say up front. */
  initialFilters?: FilterState
  onOpenCourse?: (entry: CatalogEntry) => void
  onBack?: () => void
  onClose: () => void
}) {
  const [filters, setFilters] = useState<FilterState>(initialFilters)
  /* Folded to begin with, showing only the filters that are on. */
  const [open, setOpen] = useState(false)
  const groups = useMemo(() => courseSearchFilters(entries), [entries])
  const shown = entries.filter((entry) => matches(filters, (field) => courseAnswers(entry, field)))

  return (
    <aside className="flex h-full w-full flex-col overflow-x-clip overflow-y-auto bg-card pb-28">
      <PanelTopHeader
        title="Course Search"
        subline={
          backLabel && `For ${backLabel}${credits != null ? ` • ${credits} Credits` : ""}`
        }
        backLabel={backLabel}
        onBack={onBack}
        closeLabel="Close course search"
        onClose={onClose}
      />
      <div className="flex w-full flex-col gap-4 px-6 pt-4">
        {/* The same filters the remaining list has: a button for each, and what is
            chosen as tags under them, so what the results were narrowed by is
            always on show. */}
        <div className="flex w-full flex-col gap-2">
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((was) => !was)}
            className="flex w-fit cursor-pointer items-center gap-1 text-body-md font-semibold text-foreground"
          >
            <Icon name="filter-alt" size={16} className="text-gray-100" />
            Filters
            <Icon name={open ? "expand-less" : "expand-more"} size={16} className="text-gray-100" />
          </button>
          <FilterBar groups={groups} filters={filters} onChange={setFilters} onlyActive={!open} />
        </div>
        <CourseSearch entries={shown} onOpenCourse={onOpenCourse} bare />
      </div>
    </aside>
  )
}
