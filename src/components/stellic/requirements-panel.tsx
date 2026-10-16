import { useDraggable } from "@dnd-kit/core"
import { cn } from "cn"

import { Icon } from "@/components/icon"
import {
  FilterBar,
  matches,
  type FilterGroup,
  type FilterState,
} from "@/components/stellic/filter-bar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { incomingTotals } from "@/data/incoming"
import {
  CREDITS_PER_COURSE,
  DEGREE,
  courseTags,
  planStanding,
  type MetadataField,
  type Year,
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
  overlay,
  onOpen,
}: {
  entry: CatalogEntry
  id?: string
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
  const tags = courseTags(
    {
      id: "requirement",
      code: entry.code,
      name: entry.name,
      credits: CREDITS_PER_COURSE,
      ...(entry.placeholder ? {} : { campus: "Main", modality: "In Person" }),
    },
    details
  )
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
        <span className="truncate text-body-md text-gray-100">{entry.code}</span>
        <span className="truncate text-body-md font-semibold text-foreground">{entry.name}</span>
        {tagBadges}
        {/* Said the way a section says it, so a course that cannot be taken yet
            is marked where it is read. */}
        {!prereqsMet(entry) && (
          <span className="flex items-center gap-1 pt-1 text-body-md text-alert-100">
            <Icon name="error-outline" size={14} className="shrink-0" />
            <span className="min-w-0">Course eligibility criteria not met</span>
          </span>
        )}
        {/* What the course would count for, so a list grouped any other way
            than by requirement still says it. A seat is the requirement. */}
        {entry.reason && (
          <span className="truncate pt-1 text-body-md font-medium text-gray-80">
            Counting for {entry.reason}
          </span>
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

/** One of the shares of the degree, drawn as a length of the bar and read
 *  back underneath it. */
type Share = {
  label: string
  count: number
  icon: "check" | "watch-later" | "calendar-month" | "crop-square"
  bar: string
  tone: string
}

function Meter({ total, shares }: { total: number; shares: Share[] }) {
  /* A share of nothing is not a share: it draws no bar and it has nothing to
     report, so it is left out rather than shown as a nought. */
  const held = shares.filter((share) => share.count > 0)

  return (
    <div className="flex w-full flex-col gap-2">
      <span className="flex h-1.5 w-full overflow-hidden rounded-md bg-gray-5">
        {held.map((share) => (
          <span
            key={share.label}
            className={share.bar}
            style={{ width: `${total === 0 ? 0 : (share.count / total) * 100}%` }}
          />
        ))}
      </span>
      <span className="flex flex-wrap items-center gap-4">
        {held.map((share) => (
          <span
            key={share.label}
            title={share.label}
            className="flex items-center gap-1 text-body-md text-gray-100"
          >
            <Icon name={share.icon} size={16} className={share.tone} />
            {share.count}
          </span>
        ))}
      </span>
    </div>
  )
}

export function RequirementsPanel({
  entries,
  years,
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
  /** The plan as it stands, for the shares at the top. */
  years: Year[]
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

  /* Where the student stands, in the four states they are in at once: the
     credit they arrived with, the term they are sitting in, the terms they
     have planned, and the requirements with no term yet. Each is read from
     where it actually lives rather than inferred from the others — which is
     also why the bar is the sum of its own shares rather than the degree's
     forty: the credit that came in with them is credit the degree did not ask
     for, and a bar drawn against forty would run past its end. */
  const standing = planStanding(years, incomingTotals())
  const done = standing.completed.reqs
  const going = standing.inProgress.reqs
  const placed = standing.planned.reqs
  const total = done + going + placed + entries.length

  /* Only what the filters leave. They narrow the list rather than the degree,
     so the meters above go on describing the whole of it. */
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
      {/* The same bar Generate Plan opens with: the panel's name, a rule under
          it, and the way out. */}
      <header className="flex shrink-0 items-center gap-2 border-b border-gray-40 px-6 pt-3 pb-[15px]">
        <h2 className="min-w-0 flex-1 text-caption-lg font-semibold text-foreground">
          {title}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Close ${title}`}
          onClick={onClose}
        >
          <Icon name="s-close" size={16} />
        </Button>
      </header>

      <div className="flex flex-1 flex-col gap-8 p-6 pb-28">

      {/* What the plan answers to, which is what decides what is left, and
          then how much of it is. Two blocks read the same way — a label
          over its content — and stand evenly apart. The programme and the
          minor beside it: two of them, because a plan that answers to both
          is the case no single track is ever built for. Set on a gray box so
          the two read as one summary of the degree, apart from the list. */}
      <div className="flex w-full flex-col gap-6 rounded-md bg-gray-0 p-4">
        <PlanFacet
          label="Programs"
          add="add program"
          values={[
            `${DEGREE.credential} (${DEGREE.concentration})`,
            `Minor in ${DEGREE.minor}`,
          ]}
        />

      <div className="flex w-full flex-col gap-2">
        <span className="text-body-md font-semibold text-foreground">Progress</span>
        <Meter
          total={total}
          shares={[
            {
              label: "Complete",
              count: done,
              icon: "check",
              bar: "bg-success-50",
              tone: "text-success-50",
            },
            {
              label: "In progress",
              /* Under way rather than bought: the clock, not the trolley. */
              count: going,
              icon: "watch-later",
              bar: "bg-warning-50",
              tone: "text-warning-50",
            },
            {
              label: "Planned",
              count: placed,
              icon: "calendar-month",
              bar: "bg-warning-25",
              tone: "text-warning-25",
            },
            {
              label: "Still to place",
              count: entries.length,
              icon: "crop-square",
              bar: "bg-gray-40",
              tone: "text-gray-80",
            },
          ]}
        />
      </div>

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
