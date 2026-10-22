import { useDraggable } from "@dnd-kit/core"
import { cn } from "cn"

import { Icon } from "@/components/icon"
import {
  FilterBar,
  matches,
  type FilterGroup,
  type FilterState,
} from "@/components/stellic/filter-bar"
import { PanelTopHeader } from "@/components/stellic/panel-top-header"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ALL_ELECTIVES,
  ELECTIVE_COURSES,
  offeredIn,
  type CatalogEntry,
  type TermName,
} from "@/data/catalog"
import { PREREQ_LABEL, prereqsMet } from "@/data/course-detail"
import { catalogCourse, eligibility } from "@/data/course-sidebar"
import {
  DEGREE,
  courseTags,
  type MetadataField,
} from "@/data/plan"
import { useNudge } from "@/lib/nudge"

/* Everything the degree still wants, with nowhere to be yet. The plan is not
 * finished until this list is empty, so each row is picked up from here and
 * dropped into the term it is going to be taken in. */

/** The id a row is dragged under. The planner reads the index back off it. */
export const REQUIREMENT_ID = "requirement:"

export function requirementIndex(id: string): number | null {
  if (!id.startsWith(REQUIREMENT_ID)) return null
  const index = Number(id.slice(REQUIREMENT_ID.length))
  return Number.isNaN(index) ? null : index
}

/** A course still to place, or a seat held against a requirement that has no
 *  course chosen for it. The seat says what it is for rather than naming a
 *  course, and opens onto the choice; the course is itself. */
export function RequirementRow({
  entry,
  id,
  details = [],
  groupedBy = "Requirement",
  overlay,
  onOpen,
}: {
  entry: CatalogEntry
  id?: string
  /** How the list is filed. Whatever the heading over the row already says is
   *  not said again on it: filed by requirement, the row says when the course
   *  is offered; filed by term, it says what the course counts for. */
  groupedBy?: "Requirement" | "Term offered"
  /** What Course details has switched on. A requirement says what it can of
   *  them: it has a credit value and the campus it would be taken on, but no
   *  instructor or room until a class is chosen, and what it cannot say it
   *  leaves off, as a card on the plan does. */
  details?: MetadataField[]
  /** Drawn under the cursor rather than in the list. */
  overlay?: boolean
  /** Opens the course on its own. A press that does not travel far enough to
   *  start a drag is a click, which is what this answers. */
  onOpen?: () => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: id ?? `${REQUIREMENT_ID}overlay`,
    disabled: overlay || id == null,
  })

  const { props: nudge, nudged } = useNudge(!overlay && id != null && !isDragging)
  /* The first prerequisite still to take, by its code, for the line under the
     warning. */
  const blocker =
    entry.placeholder || prereqsMet(entry)
    ? null
    : (eligibility(entry).lines.find((line) => !line.met)?.label.split(",")[0] ?? null)
  /* Only what a course has before a class is chosen for it. */
  const tags = courseTags(catalogCourse(entry), details)
  const tagBadges = tags.length > 0 && (
    <span className="flex flex-wrap items-start gap-1 pt-1">
      {tags.map((tag) => (
        <Badge key={tag} variant="secondary">
          {tag}
        </Badge>
      ))}
    </span>
  )

  /* A seat is drawn the way the plan draws one: the requirement it answers
     over the line that goes to the courses that could fill it. Both open the
     choice, and the whole of it can be picked up. */
  if (entry.placeholder) {
    const options = (ELECTIVE_COURSES[entry.code] ?? ALL_ELECTIVES).length
    return (
      <div
        ref={overlay ? undefined : setNodeRef}
        {...(overlay ? {} : listeners)}
        {...(overlay ? {} : attributes)}
        onClick={overlay ? undefined : onOpen}
        {...nudge}
        className={cn(
          nudged && "animate-nudge",
          "flex w-full cursor-grab flex-col rounded-md border border-dashed border-gray-40 bg-gray-0",
          !overlay && onOpen && "transition-colors hover:bg-gray-5",
          overlay && "cursor-grabbing shadow-secondary",
          isDragging && "opacity-40"
        )}
      >
        <p className="truncate border-b border-dashed border-gray-40 px-[11px] py-2 text-body-md font-semibold text-foreground">
          Requirement: {entry.name}
        </p>
        <span className="flex items-center gap-2 p-[11px]">
          <Icon name="drag-indicator" size={16} className="shrink-0 text-foreground" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-body-md text-foreground">
              Choose 1 of {options} {options === 1 ? "course" : "courses"}
            </span>
            {tagBadges}
          </span>
        </span>
      </div>
    )
  }

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      {...(overlay ? {} : listeners)}
      {...(overlay ? {} : attributes)}
      onClick={overlay ? undefined : onOpen}
      {...nudge}
      className={cn(
        nudged && "animate-nudge",
        "flex w-full cursor-grab items-center gap-2 rounded-md border border-gray-40 bg-card p-[11px]",
        !overlay && onOpen && "transition-colors hover:bg-gray-0",
        overlay && "cursor-grabbing shadow-secondary",
        isDragging && "opacity-40"
      )}
    >
      <Icon name="drag-indicator" size={16} className="shrink-0 text-foreground" />

      <span className="flex min-w-0 flex-1 flex-col">
        {/* The code and the name share a line, the way a card on the plan has them. */}
        <span className="flex min-w-0 items-center gap-2 text-body-md">
          <span className="shrink-0 text-gray-100">{entry.code}</span>
          <span className="min-w-0 truncate font-semibold text-foreground">{entry.name}</span>
        </span>
        {tagBadges}
        {/* Not eligible is a state to get out of, so it says what to do first:
            the way a section says it, with the first thing still to take. */}
        {!prereqsMet(entry) && (
          <span className="flex flex-col pt-1 text-body-md">
            <span className="flex items-center gap-1 text-alert-100">
              <Icon name="error-outline" size={14} className="shrink-0" />
              <span className="min-w-0">Not eligible right now</span>
            </span>
            {blocker && <span className="text-gray-80">Take {blocker} first</span>}
          </span>
        )}
        {/* The one thing the heading above does not say. A seat is the
            requirement, so it needs neither. */}
        {groupedBy === "Requirement" ? (
          offeredIn(entry.code).length > 0 && (
            <span className="truncate pt-1 text-body-md font-medium text-gray-80">
              Offered in {offeredIn(entry.code).join(", ")}
            </span>
          )
        ) : (
          entry.reason && (
            <span className="truncate pt-1 text-body-md font-medium text-gray-80">
              Counting for {entry.reason}
            </span>
          )
        )}
      </span>
    </div>
  )
}

/* What the list can be narrowed to. The row is the one Advanced What-If uses;
 * what belongs here is the three questions worth asking of a requirement you
 * are about to place: is it a course or a seat, when does it run, and can you
 * take it yet. */
const TERMS: TermName[] = ["Fall", "Spring", "Summer"]

const FILTERS: FilterGroup[] = [
  {
    id: "kind",
    label: "Type",
    fields: [
      {
        id: "kind",
        label: "Type",
        placeholder: "Core courses or electives",
        options: ["Only core courses", "Only electives"],
        mode: "menu",
      },
    ],
  },
  {
    id: "offered",
    label: "Offered",
    fields: [{ id: "offered", label: "Offered in", placeholder: "Select term", options: TERMS }],
  },
  {
    id: "prereqs",
    label: "Eligibility",
    fields: [
      {
        id: "prereqs",
        label: "Eligibility",
        placeholder: "Select standing",
        options: [PREREQ_LABEL.met, PREREQ_LABEL.not],
        mode: "menu",
      },
    ],
  },
]

/** What a requirement answers each filter with. A seat has no course behind
 *  it, so it has no offerings and nothing to be ineligible for — it answers
 *  the question about what it is, and passes Eligibility. */
function answers(entry: CatalogEntry, field: string): string | string[] {
  if (field === "kind") return entry.placeholder ? "Only electives" : "Only core courses"
  /* A seat has nothing to be ineligible for, so it passes Eligibility rather
     than vanishing the moment the filter is on. */
  if (field === "prereqs") {
    return entry.placeholder || prereqsMet(entry) ? PREREQ_LABEL.met : PREREQ_LABEL.not
  }
  if (entry.placeholder) return []
  if (field === "offered") return offeredIn(entry.code)
  return []
}

const GROUPINGS = ["Requirement", "Term offered"] as const
type Grouping = (typeof GROUPINGS)[number]

/** What the list is narrowed to and how it is filed. */
export type Narrowing = { filters: FilterState; grouping: Grouping }

/** Opens on everything still to place. A course the student cannot take yet
 *  stays in the list and says so on its card, rather than going missing until
 *  a filter is taken off. */
export const NARROWING_DEFAULT: Narrowing = {
  filters: {},
  grouping: "Term offered",
}

/** What a requirement is filed under, which is the whole of the grouping. A
 *  course that comes round once a year says so where it is filed: that is the
 *  fact worth knowing about it when you are deciding what to take when. */
function groupName(entry: CatalogEntry, by: Grouping): string {
  if (by === "Requirement") return entry.reason ?? "Other requirements"
  if (entry.placeholder) return "Any term"
  const terms = offeredIn(entry.code)
  return terms.length > 1 ? terms.join(" and ") : `Only ${terms[0]}`
}

/* Every term first, then the ones that come round once a year, then the seats
   that have no offerings of their own. Groups outside this read in the order
   the degree asks for them, which is the order they arrive in. */
const TERM_GROUP_ORDER = [
  "Fall and Spring and Summer",
  "Fall and Spring",
  "Only Fall",
  "Only Spring",
  "Only Summer",
  "Any term",
]

export function RequirementsPanel({
  entries,
  narrowing,
  onNarrow,
  details,
  onOpenCourse,
  title = "Add Remaining Courses",
  onClose,
}: {
  /** The panel's name, which says how it was asked for. */
  title?: string
  /** What is still to place, in the order the degree asks for it, each with
   *  its place in that list. */
  entries: { entry: CatalogEntry; index: number }[]
  /** How the list is narrowed and filed. Held by the page rather than here,
   *  so opening one of these courses and coming back finds the list as it was
   *  left rather than as it starts. */
  narrowing: Narrowing
  onNarrow: (next: Narrowing) => void
  /** What Course details is showing, which the rows say of themselves too. */
  details?: MetadataField[]
  /** Opens one of them on its own, by its place in the outstanding list. */
  onOpenCourse?: (index: number) => void
  onClose?: () => void
}) {
  const { filters, grouping } = narrowing
  const setFilters = (next: FilterState) => onNarrow({ ...narrowing, filters: next })
  const setGrouping = (next: Grouping) => onNarrow({ ...narrowing, grouping: next })

  /* Only what the filters leave. They narrow the list rather than the degree. */
  const shown = entries.filter(({ entry }) =>
    matches(filters, (field) => answers(entry, field))
  )

  /* Grouped the way the degree asks for them — core before concentration
     before general — which is the order they are listed in, unless the
     student would rather see when they can be taken. */
  const groups: { name: string; entries: { entry: CatalogEntry; index: number }[] }[] = []
  shown.forEach(({ entry, index }) => {
    const name = groupName(entry, grouping)
    const group = groups.find((g) => g.name === name)
    if (group) group.entries.push({ entry, index })
    else groups.push({ name, entries: [{ entry, index }] })
  })
  if (grouping === "Term offered") {
    groups.sort((a, b) => TERM_GROUP_ORDER.indexOf(a.name) - TERM_GROUP_ORDER.indexOf(b.name))
  }

  return (
    /* pb-28 keeps the last few rows clear of the assistant, which floats over
       the foot of whatever is beside the plan. */
    <aside className="flex h-full w-full flex-col overflow-x-clip overflow-y-auto bg-card">
      <PanelTopHeader title={title} onClose={onClose} />

      <div className="flex flex-1 flex-col gap-8 p-6 pb-28">

      {/* What the plan answers to, which is what decides what is left. The
          programme and the minor beside it: two of them, because a plan that
          answers to both is the case no single track is ever built for. */}
      <div className="flex w-full flex-col gap-6">
        <PlanFacet
          label="Programs"
          add="add program"
          values={[
            `${DEGREE.credential} (${DEGREE.concentration})`,
            `Minor in ${DEGREE.minor}`,
          ]}
        />
        <PlanFacet label="Pathways" add="add pathway" values={[DEGREE.pathway]} />


      </div>

      <div className="flex w-full flex-col gap-2">
        <span className="flex items-center gap-1 text-body-md font-semibold text-foreground">
          <Icon name="filter-alt" size={16} className="text-gray-100" />
          Filter
        </span>
        <FilterBar groups={FILTERS} filters={filters} onChange={setFilters} />
      </div>

      {/* The list and what heads it: one block, with its own rhythm inside. */}
      <div className="flex w-full flex-col gap-6">
      <div className="flex w-full flex-col gap-1">
        <div className="flex w-full items-center justify-between gap-2">
        <h3 className="min-w-0 text-body-md font-semibold text-gray-100">
          {/* Narrowed, the count says what of what: the degree still wants all
              of them, and this is the part you are looking at. */}
          {shown.length === entries.length
            ? `${entries.length} Remaining Requirement${entries.length === 1 ? "" : "s"}`
            : `${shown.length} of ${entries.length} Remaining Requirements`}
        </h3>
        <a
          href="#"
          className="shrink-0 text-body-md text-primary-50 underline [text-underline-position:from-font]"
        >
          view in Progress
        </a>
        </div>

        {/* How the list below is filed, which belongs under what it is filing
            rather than up among the questions that narrow it. */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-fit cursor-pointer items-center gap-1 text-body-md text-gray-80"
            >
              Group by: <span className="text-gray-100">{grouping}</span>
              <Icon name="expand-more" size={16} className="shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[180px]">
            {GROUPINGS.map((option) => (
              <DropdownMenuItem
                key={option}
                onSelect={() => setGrouping(option)}
                className="py-1.5 text-body-md"
              >
                {option}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {entries.length === 0 && (
        <p className="text-body-md text-gray-80">
          Every requirement has a term. There is nothing left to place.
        </p>
      )}

      {entries.length > 0 && shown.length === 0 && (
        <p className="text-body-md text-gray-80">
          Nothing left to place answers all of those at once. Try dropping one.
        </p>
      )}

      {groups.map((group) => (
        <div key={group.name} className="flex w-full flex-col gap-2">
          <div className="flex w-full items-baseline justify-between gap-2 text-body-md text-gray-80">
            <span className="min-w-0 truncate">{group.name}</span>
            <span className="shrink-0">{group.entries.length} remaining</span>
          </div>
          {group.entries.map(({ entry, index }) => (
            <RequirementRow
              key={`${entry.code}-${index}`}
              id={`${REQUIREMENT_ID}${index}`}
              entry={entry}
              details={details}
              groupedBy={grouping}
              onOpen={onOpenCourse && (() => onOpenCourse(index))}
            />
          ))}
        </div>
      ))}
      </div>
      </div>
    </aside>
  )
}

/** A label on its own line over its tags, the way the meter below is a label
 *  over its bar. Adding another sits at the end of the label's line, so the
 *  tags under it are only ever what the plan answers to. */
function PlanFacet({ label, add, values }: { label: string; add: string; values: string[] }) {
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex w-full items-center justify-between gap-2">
        <span className="text-body-md font-semibold text-foreground">{label}</span>
        <a
          href="#"
          className="shrink-0 text-body-md text-gray-80 underline [text-underline-position:from-font]"
        >
          + {add}
        </a>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {values.map((value) => (
          <Badge key={value} variant="outline" className="max-w-full">
            <span className="min-w-0 truncate">{value}</span>
            <Icon name="close" size={12} className="shrink-0" />
          </Badge>
        ))}
      </div>
    </div>
  )
}
