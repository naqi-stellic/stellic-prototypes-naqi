import { cn } from "cn"
import { useState, type ComponentProps, type ReactNode } from "react"

import { Icon } from "@/components/icon"
import { AuditIcon } from "@/components/stellic/primitives"
import { PanelHeader } from "@/components/stellic/panel-header"
import { useRegistration } from "@/components/stellic/registration"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import type { CatalogEntry } from "@/data/catalog"
import { activityFor, courseDetail, meetingLines } from "@/data/course-detail"
import {
  canvasActivity,
  eligibility,
  gradeOf,
  instancesOf,
  lastCanvasActivity,
  meetingDays,
  planningChecklist,
  SECTION_REQUIREMENTS,
  sectionsFor,
  STAGE_LABEL,
  stageOf,
  usuallyOffered,
  type Instance,
  type SidebarSection,
  type Stage,
  type Step
} from "@/data/course-sidebar"
import type { ChosenSection } from "@/data/draft"
import { DEGREE, type Meeting, type Term } from "@/data/plan"

/* The course sidebar. One course, read at whatever point it is at: not yet in
 * the plan, planned, registered, under way, taken. Every point has the same
 * sections in the same order, and each opens only the one that answers what
 * matters there — whether it can be taken and what it counts for before it is
 * planned, what to do next once it is, how it is going while it runs, and what
 * it counted for once it is done. Everything else is a click away.
 *
 * A course the plan holds more than once — failed and retaken, say — gets a
 * tab for each time, newest first, and a Catalog tab for planning it again. */

/* ------------------------------------------------------------------ pieces */

/** One of the sidebar's sections: its name, what it comes to while folded,
 *  and everything under it. */
export function Fold({
  title,
  summary,
  extra,
  open,
  onToggle,
  ruled = true,
  children
}: {
  title: string
  /** Said beside the title, so a folded section still answers its question. */
  summary?: ReactNode
  /** A control that sits with the chevron rather than in the body. */
  extra?: ReactNode
  open: boolean
  onToggle: () => void
  /** Whether a rule stands above it. The first section may go without, where
   *  what is above it already ends the block. */
  ruled?: boolean
  children: ReactNode
}) {
  return (
    /* Ruled above, and below too where it is the last of them, so the list
       of sections ends on a line rather than trailing into the panel. */
    <section
      className={cn(
        "flex w-full flex-col last:border-b last:border-gray-40",
        ruled && "border-t border-gray-40"
      )}
    >
      {/* The whole row folds it: the title's button reaches across the row,
          and anything else on the row sits above that reach. */}
      <div className="relative flex w-full items-center gap-2 px-6 py-4 transition-colors hover:bg-gray-0">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-label={`${open ? "Collapse" : "Expand"} ${title}`}
          className="min-w-0 flex-1 cursor-pointer text-left text-caption-lg font-semibold text-gray-100 after:absolute after:inset-0"
        >
          {title}
        </button>
        {summary}
        {extra && <span className="relative z-10 flex">{extra}</span>}
        <Icon
          name={open ? "unfold-less" : "unfold-more"}
          size={16}
          className="shrink-0 text-gray-100"
        />
      </div>
      {/* A little clear of the row, so its hover gray never sits against
          the first line of what it opened. */}
      {open && <div className="flex w-full flex-col gap-4 px-6 pt-2 pb-4">{children}</div>}
    </section>
  )
}

export function Heading({ children }: { children: ReactNode }) {
  return <h4 className="text-body-md font-semibold text-gray-100">{children}</h4>
}

function Tags({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <Badge key={item} variant="outline">
          {item}
        </Badge>
      ))}
    </div>
  )
}

/** The square beside a requirement: a tick where it is met, a red outline
 *  where it is not. */
function Check({ met }: { met: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-[3px] border",
        met ? "border-success-100 bg-success-100 text-white" : "border-alert-100 bg-alert-5"
      )}
    >
      {met && <Icon name="check" size={12} />}
    </span>
  )
}

function Picker({
  label,
  value,
  options,
  onChange
}: {
  label: string
  value: string
  options: string[]
  onChange: (next: string) => void
}) {
  return (
    <div className="flex w-full flex-col gap-2">
      <span className="text-body-md font-semibold text-foreground">{label}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={label}
            className="flex h-9 w-full cursor-pointer items-center gap-2 rounded-md border border-input bg-card px-[11px] text-body-md text-foreground shadow-xs"
          >
            <span className="min-w-0 flex-1 truncate text-left">{value}</span>
            <Icon name="expand-more" size={16} className="shrink-0 text-gray-60" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
          {options.map((option) => (
            <DropdownMenuItem
              key={option}
              onSelect={() => onChange(option)}
              className="py-1.5 text-body-md"
            >
              {option}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

/* ------------------------------------------------------------------- tabs */

/** The audit's own mark for each point a course can be at, so the plan and the
 *  audit say the same thing in the same square. */
const AUDIT_STATE: Record<Stage, ComponentProps<typeof AuditIcon>["state"]> = {
  planned: "planned",
  registered: "pre-registered",
  progress: "registered",
  taken: "completed",
}

const CATALOG = "catalog"
/** Prefix for "just added to this term", until the plan says where it is. */
const ADDED = "added:"

const keyOf = ({ course, term }: Instance) => `${term.id}:${course.id}`

/* --------------------------------------------------------------- checklist */

const STEP_MARK: Record<Step["state"], ReactNode> = {
  done: <Icon name="check-circle" size={16} className="shrink-0 text-success-100" />,
  current: <span className="size-4 shrink-0 rounded-full border-2 border-warning-100" />,
  todo: <span className="size-4 shrink-0 rounded-full border-2 border-gray-60" />,
  blocked: <Icon name="error-outline" size={16} className="shrink-0 text-alert-100" />
}

function Checklist({
  title,
  steps,
  onCalendar,
  onRegister
}: {
  /** The heading over the steps, with the way to see what is done beside it. */
  title: string
  steps: Step[]
  onCalendar?: () => void
  onRegister?: () => void
}) {
  /* What is done is out of the way until it is asked for: what is next is the
     reason to be here. With nothing left to do there is nothing to put away —
     the whole fold folds instead. */
  const [showDone, setShowDone] = useState(false)
  const done = steps.filter((step) => step.state === "done").length
  const putAway = done > 0 && done < steps.length
  const listed = putAway && !showDone ? steps.filter((step) => step.state !== "done") : steps

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex w-full items-center justify-between gap-4">
        <h3 className="text-h300 font-semibold text-gray-100">{title}</h3>
        {putAway && (
          <button
            type="button"
            aria-expanded={showDone}
            onClick={() => setShowDone((was) => !was)}
            className="w-fit cursor-pointer text-body-md text-gray-80 underline [text-underline-position:from-font]"
          >
            {showDone ? "Hide completed" : `Show ${done} completed`}
          </button>
        )}
      </div>
      <ol className="flex w-full flex-col gap-3">
        {listed.map((step) => (
          <li
            key={step.label}
            className="flex w-full items-center gap-2 text-body-md text-gray-100"
          >
            {/* Level with the step's first line, where it has a second. */}
            <span className={cn("flex h-5 shrink-0 items-center", step.detail && "self-start")}>
              {STEP_MARK[step.state]}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              {step.label}
              {step.detail && <span className="text-gray-80">{step.detail}</span>}
            </span>
            {step.action === "calendar" && onCalendar && (
              <Button size="sm" className="shrink-0" onClick={onCalendar}>
                View Term
              </Button>
            )}
            {step.action === "register" && onRegister && (
              <Button variant="primary" size="sm" className="shrink-0" onClick={onRegister}>
                Register Now
              </Button>
            )}
            {step.chip && (
              <span className="flex shrink-0 items-center gap-1 rounded-md bg-gray-5 px-1.5 py-0.5 text-label-md text-gray-100">
                <Icon name="timer" size={12} />
                {step.chip}
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}

/* ---------------------------------------------------------------- sections */

/** Why a section is left out of the list until it is asked for. Full or held
 *  for students who meet something more, a section can still be chosen —
 *  registering for a full one puts the student on its waitlist. */
function heldBack(section: SidebarSection, clash: string | null): string | null {
  if (!section.eligible) return "Not eligible for this section right now"
  if (clash) return `Clashes with ${clash}`
  return null
}

function SectionDetail({ section }: { section: SidebarSection }) {
  const registration = useRegistration()
  const [more, setMore] = useState(false)
  return (
    <div className="flex w-full flex-col gap-4 border-t border-gray-40 p-4">
      <div className="flex flex-col gap-1 text-body-md text-gray-100">
        {meetingDays(section.meetings).map((line, i) => (
          <span key={line} className="font-semibold">
            {line}
            {i === 0 && " • In Person"}
          </span>
        ))}
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-gray-80">
          <span className="flex items-center gap-1">
            <Icon name="class" size={14} />
            {section.building}
          </span>
          <span className="flex items-center gap-1">
            <Icon name="place" size={14} />
            {section.room}
          </span>
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <span className="flex items-center gap-2">
          <Heading>Section Eligibility</Heading>
          <Badge variant={section.eligible ? "success" : "danger"}>
            {section.eligible ? "Eligible" : "Not eligible right now"}
          </Badge>
        </span>
        {section.eligible ? (
          <p className="text-body-md text-gray-80">No requirements beyond the course's own.</p>
        ) : (
          <ul className="flex list-disc flex-col gap-2 pl-5 text-body-md text-gray-100">
            {registration && <li>Registration disallowed for this section</li>}
            <li>
              Prerequisites:
              <ul className="mt-2 flex flex-col gap-2">
                {SECTION_REQUIREMENTS.map((req) => (
                  <li key={req.label} className="flex items-center gap-2">
                    <Check met={false} />
                    <span className="min-w-0 flex-1">{req.label}</span>
                    <span className="shrink-0 text-alert-100">{req.status}</span>
                  </li>
                ))}
              </ul>
            </li>
          </ul>
        )}
      </div>

      <p className="text-body-md text-gray-100">
        <span className="font-semibold">Class No</span> {section.classNo}
      </p>

      <div className="flex flex-col gap-1">
        <Heading>Instructors</Heading>
        <ul className="list-disc pl-5 text-body-md text-gray-100">
          {section.instructors.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-body-md text-gray-100">
          <span className="font-semibold">Max Enrollment</span>{" "}
          <span className={section.available > 0 ? "text-success-100" : "text-alert-100"}>
            {section.available}/{section.capacity}
          </span>{" "}
          seats available
        </p>
        <span className="text-label-md text-gray-80">Last updated a few seconds ago</span>
      </div>

      <div className="flex flex-col gap-1">
        <Heading>Enrollment Notes</Heading>
        <p className="text-body-md text-gray-80">
          {more ? section.notes : `${section.notes.slice(0, 110)}…`}
        </p>
        <button
          type="button"
          onClick={() => setMore((was) => !was)}
          className="w-fit cursor-pointer text-body-md text-gray-80 underline [text-underline-position:from-font]"
        >
          {more ? "Show less" : "Show more"}
        </button>
      </div>
    </div>
  )
}

function SectionRow({
  section,
  chosen,
  why,
  canPick,
  onPick,
  onPreview
}: {
  section: SidebarSection
  chosen: boolean
  /** Why the row is held back, said under its hours. */
  why: string | null
  canPick: boolean
  onPick: () => void
  onPreview?: (on: boolean) => void
}) {
  /* The student's own class opens on its details, since it is the one they are
     reading about; the others open when asked. */
  const [open, setOpen] = useState(chosen)
  /* Choosing another class moves the open details with it: the class just
     chosen opens, and the one that was chosen folds. */
  const [wasChosen, setWasChosen] = useState(chosen)
  if (chosen !== wasChosen) {
    setWasChosen(chosen)
    setOpen(chosen)
  }
  return (
    <div
      onMouseEnter={() => onPreview?.(true)}
      onMouseLeave={() => onPreview?.(false)}
      className={cn(
        "flex w-full flex-col rounded-md border bg-card",
        chosen ? "border-primary-50 bg-primary-0" : "border-gray-40"
      )}
    >
      <div className="flex w-full items-stretch">
        {canPick || chosen ? (
          <button
            type="button"
            disabled={chosen}
            onClick={onPick}
            aria-label={chosen ? `${section.code} is your section` : `Choose ${section.code}`}
            className={cn(
              "flex w-10 shrink-0 items-center justify-center border-r",
              chosen
                ? "cursor-default border-primary-50 text-primary-50"
                : "cursor-pointer border-gray-40 text-gray-100 hover:bg-gray-5"
            )}
          >
            <Icon name={chosen ? "check" : "add"} size={16} />
          </button>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col gap-1 py-3 pl-4">
          <div className="flex w-full items-center gap-4">
            <span className="w-[52px] shrink-0 text-body-md font-semibold text-gray-100">
              {section.code}
            </span>
            <span className="min-w-0 flex-1 text-body-md text-gray-100">
              {section.when.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </span>
            <span
              className={cn(
                "shrink-0 text-body-md",
                section.available > 0 ? "text-success-100" : "text-alert-100"
              )}
            >
              {section.available}/{section.capacity} seats available
            </span>
          </div>
          {why && (
            <span className="flex items-center gap-1 text-body-md text-alert-100">
              <Icon name="error-outline" size={14} className="shrink-0" />
              {why}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen((was) => !was)}
          aria-expanded={open}
          aria-label={`${open ? "Hide" : "Show"} ${section.code} details`}
          className="flex w-10 shrink-0 cursor-pointer items-center justify-center text-gray-100"
        >
          <Icon name={open ? "expand-more" : "chevron-right"} size={16} />
        </button>
      </div>
      {open && <SectionDetail section={section} />}
    </div>
  )
}

/* ------------------------------------------------------------------- panel */

export function CoursePanel({
  entry,
  terms,
  plan,
  opened,
  backLabel,
  filling,
  onAdd,
  onPickSection,
  onPreviewSection,
  onRemove,
  onRegister,
  onViewCalendar,
  onBack,
  onClose
}: {
  entry: CatalogEntry
  /** Where it could be planned: the terms that would take it. */
  terms: Term[]
  /** Every term in the plan: where the course already sits, and what the rest
   *  of each term keeps, so a section that clashes can say so. */
  plan: Term[]
  /** The place in the plan it was opened from, where it was opened from one. */
  opened?: Instance
  /** What the way back is to, where there is somewhere to go back to — a
   *  search or a placeholder's list. Opened from a card on the plan, there is
   *  nothing behind it but the plan, and no way back is drawn. */
  backLabel?: string
  /** Opened to fill a placeholder in this term: the catalogue is where that
   *  is done, set to the placeholder's term, whatever else the plan holds. */
  filling?: string
  onAdd: (termId: string, pick?: ChosenSection) => void
  /** Settles one instance on a section. */
  onPickSection?: (at: Instance, section: string, meetings: Meeting[]) => void
  /** The section the cursor is over, for a week beside the panel to draw. */
  onPreviewSection?: (
    at: Instance,
    hovered: { section: string; meetings: Meeting[] } | null
  ) => void
  /** Takes one instance out of the plan, where its term still takes changes. */
  onRemove?: (at: Instance) => void
  /** Opens the term's registration. */
  onRegister?: (term: Term, courseId?: string) => void
  /** Opens the term on its week, where its classes can be seen. */
  onViewCalendar?: (term: Term) => void
  onBack: () => void
  onClose: () => void
}) {
  const detail = courseDetail(entry)
  const instances = instancesOf(entry.code, plan)
  /* Opened from the plan, on the attempt that was clicked; from anywhere else,
     on the newest attempt where there is one, and on the catalogue where not. */
  const [tab, setTab] = useState(
    opened ? keyOf(opened) : !filling && instances[0] ? keyOf(instances[0]) : CATALOG
  )
  /* Just added to a term: the new place it sits is the tab to be on, once
     the plan has it. Until then, and if a term turns it away, the catalogue. */
  const added = tab.startsWith(ADDED) ? tab.slice(ADDED.length) : null
  const current =
    instances.find((instance) => keyOf(instance) === tab) ??
    (added ? (instances.find((instance) => instance.term.id === added) ?? null) : null)
  const shown = current ?? (tab === CATALOG || added ? null : (instances[0] ?? null))
  const selected = shown ? keyOf(shown) : CATALOG
  const [saved, setSaved] = useState(false)

  return (
    <aside className="flex h-full w-full flex-col overflow-x-clip overflow-y-auto bg-card pb-28">
      {/* The head the placeholder and the search have: a bar for the way back
          and the close, the course under it, and where it is under that. */}
      <PanelHeader
        className="border-b border-gray-40"
        backLabel={backLabel}
        onBack={onBack}
        onClose={onClose}
        closeLabel="Close course"
        title={<h2 className="text-h400 font-semibold text-gray-100">{entry.name}</h2>}
        subline={`${entry.code} • ${detail.credits} Credits`}
        controls={
          <button
            type="button"
            aria-label={saved ? "Remove bookmark" : "Bookmark course"}
            aria-pressed={saved}
            onClick={() => setSaved((was) => !was)}
            className="flex size-8 cursor-pointer items-center justify-center rounded-md text-gray-100 hover:bg-gray-5"
          >
            <Icon name={saved ? "bookmark" : "bookmark-border"} size={20} />
          </button>
        }
        footer={
          /* Where the course is, as underlined tabs set from the left, down to
             the head's rule: the active one is blue, with its underline over
             the rule. */
          <div
            role="tablist"
            aria-label="Where this course is"
            className="-mx-6 -mb-6 flex w-[calc(100%+3rem)] px-3"
          >
            {[
              ...instances.map((instance) => ({ key: keyOf(instance), label: instance.term.name })),
              { key: CATALOG, label: "Catalog" },
            ].map((item) => {
              const on = selected === item.key
              return (
                <button
                  key={item.key}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setTab(item.key)}
                  className="flex h-[38px] min-w-0 cursor-pointer flex-col justify-between"
                >
                  <span
                    className={cn(
                      "flex flex-1 items-center truncate px-3 text-caption-lg font-semibold",
                      on ? "text-primary-50" : "text-gray-100"
                    )}
                  >
                    {item.label}
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn("-mb-px h-0.5 w-full", on ? "bg-primary-50" : "bg-transparent")}
                  />
                </button>
              )
            })}
          </div>
        }
      />

      {/* Keyed on the tab, so each one opens the sections its own point in
          the course's life calls for rather than whatever the last tab left
          open. */}
      {shown ? (
        <InstanceBody
          key={keyOf(shown)}
          entry={entry}
          at={shown}
          plan={plan}
          onPickSection={onPickSection}
          onPreviewSection={onPreviewSection}
          onRegister={onRegister}
          onViewCalendar={onViewCalendar}
          onRemove={onRemove}
        />
      ) : (
        <CatalogBody
          key={CATALOG}
          entry={entry}
          terms={terms}
          plan={plan}
          startTerm={filling}
          onAdd={(termId, pick) => {
            onAdd(termId, pick)
            setTab(`${ADDED}${termId}`)
          }}
        />
      )}
    </aside>
  )
}

/* -------------------------------------------------------- the shared folds */

function EligibilityFold({
  entry,
  at,
  open,
  onToggle
}: {
  entry: CatalogEntry
  /** The term it is read against, and the plan around it. */
  at?: { term: Term; plan: Term[] }
  open: boolean
  onToggle: () => void
}) {
  const { met, lines } = eligibility(entry, at)
  const { repeatLimit } = courseDetail(entry)
  return (
    <Fold
      title="Eligibility"
      summary={
        <Badge variant={met ? "success" : "danger"}>{met ? "Eligible" : "Not eligible right now"}</Badge>
      }
      open={open}
      onToggle={onToggle}
    >
      <div className="flex w-full flex-col gap-3">
        <Heading>Prerequisites</Heading>
        {/* Not eligible is a state to get out of, so it says how. */}
        {!met && lines.length > 0 && (
          <p className="text-body-md text-gray-80">Finish these to become eligible.</p>
        )}
        {lines.length === 0 ? (
          <p className="text-body-md text-gray-80">This course has no prerequisites.</p>
        ) : (
          <ul className="flex w-full flex-col gap-3">
            {lines.map((line) => (
              <li key={line.label} className="flex w-full items-center gap-2 text-body-md">
                <Check met={line.met} />
                <span className="min-w-0 flex-1 text-gray-100">{line.label}</span>
                <span className="shrink-0 text-gray-80">{line.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {/* Whether it can be taken again is a question of whether it can be
          taken at all, so it is answered here rather than under About. */}
      <div className="flex w-full flex-col gap-1">
        <Heading>Repeat limits</Heading>
        <p className="text-body-md text-gray-100">{repeatLimit}</p>
      </div>
    </Fold>
  )
}

function CountingFold({
  entry,
  title,
  unmatched,
  open,
  onToggle
}: {
  entry: CatalogEntry
  title: string
  /** Planned or taken and answering nothing — a failed attempt, say. */
  unmatched?: boolean
  open: boolean
  onToggle: () => void
}) {
  return (
    <Fold
      title={title}
      summary={
        unmatched ? (
          <Badge variant="danger">Unmatched</Badge>
        ) : (
          <Badge variant="outline">{entry.reason}</Badge>
        )
      }
      open={open}
      onToggle={onToggle}
    >
      <div className="flex w-full flex-col gap-1">
        <Heading>Requirement</Heading>
        <p className="text-body-md text-gray-100">
          {unmatched ? (
            "This course is unmatched and cannot count for any of your programs"
          ) : (
            <>
              Satisfies “{entry.reason}” in{" "}
              <a href="/explain.html" className="underline [text-underline-position:from-font]">
                {DEGREE.credential}
              </a>
            </>
          )}
        </p>
      </div>
    </Fold>
  )
}

function AboutFold({
  entry,
  open,
  onToggle
}: {
  entry: CatalogEntry
  open: boolean
  onToggle: () => void
}) {
  const detail = courseDetail(entry)
  const [more, setMore] = useState(false)
  return (
    <Fold title="About" open={open} onToggle={onToggle}>
      <div className="flex w-full flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Heading>Attributes ({detail.attributes.length})</Heading>
          <Tags items={detail.attributes} />
        </div>
        <div className="flex flex-col gap-2">
          <Heading>Topics ({detail.topics.length})</Heading>
          <Tags items={detail.topics} />
        </div>
        <div className="flex flex-col gap-2">
          <Heading>Description</Heading>
          <p className="text-body-md text-gray-80">
            {more ? detail.description : `${detail.description.slice(0, 180)}… `}
            <button
              type="button"
              onClick={() => setMore((was) => !was)}
              className="cursor-pointer text-gray-80 underline [text-underline-position:from-font]"
            >
              {more ? " Show less" : "Show more"}
            </button>
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Heading>Required Sections</Heading>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-body-md text-gray-100">
            {detail.requiredSections.map((row) => (
              <li key={row.kind}>
                <span className="inline-flex items-center gap-2">
                  {row.kind}: {row.available} available
                  <Icon name="info" size={14} className="text-gray-80" />
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-3">
          <Heading>Instructors ({detail.instructors.length})</Heading>
          {detail.instructors.map((person) => (
            <div key={person.name} className="flex items-center gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gray-5 text-body-md text-gray-80">
                {person.name
                  .replace(/^(Dr|Prof)\. /, "")
                  .split(/[ .]/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join("")}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-body-md font-semibold text-gray-100">{person.name}</span>
                <span className="text-body-md text-gray-80">{person.semesters} semesters</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </Fold>
  )
}

/* ------------------------------------------------------------- catalog tab */

/** The course before it is anywhere in the plan, or looked at again to plan
 *  once more: where and when it would go. Opens on whatever stands in the way;
 *  with nothing in the way, on what the course is. */
function CatalogBody({
  entry,
  terms,
  plan,
  startTerm,
  onAdd
}: {
  entry: CatalogEntry
  terms: Term[]
  plan: Term[]
  /** The term to start on, where there is one to start on. */
  startTerm?: string
  onAdd: (termId: string, pick?: ChosenSection) => void
}) {
  const [campus, setCampus] = useState(courseDetail(entry).campus)
  const [termId, setTermId] = useState(startTerm ?? terms[0]?.id ?? "")
  const term = terms.find((t) => t.id === termId)
  /* Read against the term it would be added to, so changing the term says
     whether it could be taken then. */
  const against = term ? { term, plan } : undefined
  /* Already in the term it is being read against: adding it again is not on
     offer, since the term's own tab is where it is. */
  const planned = term != null && instancesOf(entry.code, plan).some((i) => i.term.id === term.id)
  const { met } = eligibility(entry, against)
  const [open, setOpen] = useState({
    eligibility: !met,
    sections: false,
    counting: false,
    about: met
  })
  const toggle = (key: keyof typeof open) => setOpen((was) => ({ ...was, [key]: !was[key] }))

  return (
    <>
      <div className="flex flex-col gap-4 bg-gray-0 px-6 py-6">
        <Picker label="Campus" value={campus} options={["Main", "Downtown"]} onChange={setCampus} />
        <div className="flex flex-col gap-2">
          <Picker
            label="Term"
            value={term?.name ?? "No term"}
            options={terms.map((t) => t.name)}
            onChange={(name) => setTermId(terms.find((t) => t.name === name)?.id ?? termId)}
          />
          <span className="text-body-md text-gray-100">
            Usually offered: {usuallyOffered(entry.code)}
          </span>
        </div>
        {term && !planned && (
          <Button variant="primary" className="w-fit" onClick={() => onAdd(term.id)}>
            Add to Plan
          </Button>
        )}
      </div>
      {/* Only where the term's classes are out: before that there is nothing to
          list. Closed, since nothing here is chosen yet. */}
      {term && (term.scheduled || term.locked) && (
        <SectionsFold
          key={term.id}
          entry={entry}
          at={{ term }}
          stage="planned"
          open={open.sections}
          onToggle={() => toggle("sections")}
          onAddSection={(section, meetings) => onAdd(term.id, { section, meetings })}
        />
      )}
      <EligibilityFold
        entry={entry}
        at={against}
        open={open.eligibility}
        onToggle={() => toggle("eligibility")}
      />
      <CountingFold
        entry={entry}
        title="Can count for"
        open={open.counting}
        onToggle={() => toggle("counting")}
      />
      <AboutFold entry={entry} open={open.about} onToggle={() => toggle("about")} />
    </>
  )
}

/** What can be done to this place the course sits in the plan. At the end of
 *  its stage's row, beside what it says about how the course stands. */
function CourseActions({ at, onRemove }: { at: Instance; onRemove?: (at: Instance) => void }) {
  const stage = stageOf(at.term, at.course)
  if (stage === "taken") return null
  const canRemove = onRemove != null && !at.term.locked

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="shrink-0">Actions</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[180px]">
        <DropdownMenuItem className="gap-2 py-1.5 text-body-md">
          <Icon name="sticky-note-2" size={16} />
          Write a note
        </DropdownMenuItem>
        {canRemove && (
          <DropdownMenuItem onSelect={() => onRemove?.(at)} className="gap-2 py-1.5 text-body-md">
            <Icon name="close" size={16} />
            Remove from plan
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/* ------------------------------------------------------------ instance tab */

/** One place the course sits in the plan, read at the point it is at. */
function InstanceBody({
  entry,
  at,
  plan,
  onRemove,
  onPickSection,
  onPreviewSection,
  onRegister,
  onViewCalendar
}: {
  entry: CatalogEntry
  at: Instance
  plan: Term[]
  onPickSection?: (at: Instance, section: string, meetings: Meeting[]) => void
  onPreviewSection?: (
    at: Instance,
    hovered: { section: string; meetings: Meeting[] } | null
  ) => void
  onRegister?: (term: Term, courseId?: string) => void
  onViewCalendar?: (term: Term) => void
  onRemove?: (at: Instance) => void
}) {
  const { course, term } = at
  const registration = useRegistration()
  const stage = stageOf(term, course)
  const { met } = eligibility(entry, { term, plan })
  const grade = gradeOf(course)
  /* A failed attempt counts for nothing; the retake is the one that does. */
  const unmatched = stage === "taken" && grade === "F"
  const sectionsOut = term.scheduled === true || term.locked === true
  const planning = stage === "planned" || stage === "registered"
  const [open, setOpen] = useState({
    sections: planning && sectionsOut,
    canvas: stage === "progress",
    eligibility: planning && !met,
    counting: stage === "taken",
    about: false,
    history: false
  })
  const toggle = (key: keyof typeof open) => setOpen((was) => ({ ...was, [key]: !was[key] }))
  const [campus, setCampus] = useState(course.campus ?? "Main")
  const [editingCampus, setEditingCampus] = useState(false)
  const moved = plan.find((t) => t.id !== term.id && !t.locked)?.name
  const activity = activityFor(entry.code, term.name, moved)

  return (
    <>
      <div className="flex flex-col gap-6 px-6 pt-4 pb-8">
        <div className="flex w-full items-center gap-2">
          {/* The state, then the audit's own mark after it, so the plan and the
              audit say the same thing in the same square. */}
          <h3 className="flex min-w-0 flex-1 items-center gap-2 text-h300 font-semibold text-gray-100">
            {STAGE_LABEL[stage]}
            <AuditIcon state={AUDIT_STATE[stage]} />
          </h3>
          <CourseActions at={at} onRemove={onRemove} />
        </div>
        {(stage === "progress" || stage === "taken") && (
          <div className="flex w-full items-center gap-4 text-body-md">
            <span className="w-[108px] shrink-0 font-semibold text-gray-100">
              {/* Overall while the course runs, final once it is done. */}
              {stage === "taken" ? "Final grade" : "Course grade"}
            </span>
            <span className="flex min-w-0 flex-1 items-center gap-1 text-caption-lg font-semibold text-gray-100">
              {/* Provisional while the course runs; final once it is done. */}
              {stage === "progress" && <Icon name="watch-later-filled" size={16} />}
              {grade}
            </span>
            {stage === "progress" && (
              <span className="shrink-0 text-gray-100">
                Last Activity: {lastCanvasActivity(course)}
              </span>
            )}
          </div>
        )}
        <div className="flex w-full items-center gap-4 text-body-md">
          <span className="w-[108px] shrink-0 font-semibold text-gray-100">Campus</span>
          {editingCampus ? (
            <div className="min-w-0 flex-1">
              <Picker
                label=""
                value={campus}
                options={["Main", "Downtown"]}
                onChange={(next) => {
                  setCampus(next)
                  setEditingCampus(false)
                }}
              />
            </div>
          ) : (
            <span className="min-w-0 flex-1 text-gray-100">{campus}</span>
          )}
          {/* Fixed once registered: the seat is on that campus. */}
          {stage === "planned" && !editingCampus && (
            <button
              type="button"
              onClick={() => setEditingCampus(true)}
              className="shrink-0 cursor-pointer text-gray-80 underline [text-underline-position:from-font]"
            >
              edit
            </button>
          )}
        </div>
      </div>

      {planning && (
        /* What is next is the reason to open the course, so it is a heading over
           its steps and not a section that folds. */
        <section className="flex w-full flex-col px-6 pb-6">
          <Checklist
            title="What's Next"
            steps={planningChecklist(term, course, met, registration)}
            onCalendar={onViewCalendar && (() => onViewCalendar(term))}
            onRegister={onRegister && (() => onRegister(term, course.id))}
          />
        </section>
      )}

      {(stage === "progress" || stage === "taken") && (
        <Fold
          title="Course Activity"
          open={open.canvas}
          onToggle={() => toggle("canvas")}
        >
          <ul className="flex w-full flex-col gap-4">
            {canvasActivity(course, stage === "taken").map((item) => (
              <li key={item.name} className="flex w-full items-start gap-4 text-body-md">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-semibold text-gray-100">{item.name}</span>
                  <span
                    className={cn(
                      item.tone === "late" && "text-alert-100",
                      item.tone === "lateSubmitted" && "text-warning-100",
                      item.tone === "onTime" && "text-success-100"
                    )}
                  >
                    {item.status}
                  </span>
                </span>
                <span className="shrink-0 text-gray-100">{item.score}</span>
              </li>
            ))}
          </ul>
        </Fold>
      )}

      {sectionsOut && (
        <SectionsFold
          /* A course that moves on — registered, say — lists its sections
             the way its new point calls for, not as they were left. */
          key={stage}
          entry={entry}
          at={at}
          stage={stage}
          open={open.sections}
          onToggle={() => toggle("sections")}
          onPickSection={onPickSection}
          onPreviewSection={onPreviewSection}
        />
      )}

      <EligibilityFold
        entry={entry}
        at={{ term, plan }}
        open={open.eligibility}
        onToggle={() => toggle("eligibility")}
      />
      <CountingFold
        entry={entry}
        title="Counting for"
        unmatched={unmatched}
        open={open.counting}
        onToggle={() => toggle("counting")}
      />
      <AboutFold entry={entry} open={open.about} onToggle={() => toggle("about")} />
      <Fold title="Activity History" open={open.history} onToggle={() => toggle("history")}>
        <ul className="flex w-full flex-col gap-4">
          {activity.map((event, i) => (
            <li key={i} className="flex w-full items-start gap-2">
              <Icon
                name={event.kind === "add" ? "add" : "close"}
                size={16}
                className={cn(
                  "mt-0.5 shrink-0",
                  event.kind === "add" ? "text-success-100" : "text-alert-100"
                )}
              />
              <span className="flex min-w-0 flex-col text-body-md">
                <span className="text-gray-100">
                  {event.kind === "add" ? "Added to" : "Removed from"} {event.term}
                </span>
                <span className="text-gray-80">
                  {event.when} by {event.who}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </Fold>
    </>
  )
}

/** The classes on offer for one instance. Only the ones the student can take
 *  and get a seat in are listed at first; the rest wait behind "see more",
 *  each saying why it was left out. Once registered, only the class the
 *  student is in — the others are there for a swap during add/drop. */
function SectionsFold({
  entry,
  at,
  stage,
  open,
  onToggle,
  onPickSection,
  onPreviewSection,
  onAddSection
}: {
  entry: CatalogEntry
  /** Where the course sits in the plan. A catalogue course is not anywhere
   *  yet, so it has only the term it is being read against. */
  at: Instance | { course?: undefined; term: Term }
  stage: Stage
  open: boolean
  onToggle: () => void
  onPickSection?: (at: Instance, section: string, meetings: Meeting[]) => void
  onPreviewSection?: (
    at: Instance,
    hovered: { section: string; meetings: Meeting[] } | null
  ) => void
  /** Where the course is not in the plan yet, a class's + puts the course
   *  there on that class. */
  onAddSection?: (section: string, meetings: Meeting[]) => void
}) {
  const { course, term } = at
  const [all, setAll] = useState(false)
  /* The class the plan has the student in, where the catalogue's list does
     not happen to include it: a list that leaves out your own class is the
     wrong list. */
  const catalog = sectionsFor(entry)
  const own: SidebarSection | null = course?.section
    ? {
        ...(catalog.find((s) => s.code === course.section) ?? catalog[0]),
        code: course.section,
        /* Drawn at the hours the plan has it at, which is where it is true. */
        meetings: course.meetings ?? [],
        when: meetingLines(course.meetings),
        instructors: course.instructor ? [course.instructor] : catalog[0].instructors
      }
    : null
  const sections: SidebarSection[] = own
    ? [own, ...catalog.filter((s) => s.code !== own.code)].sort((a, b) =>
        a.code.localeCompare(b.code)
      )
    : catalog
  /* The hours the rest of the term already keeps. */
  const busy = new Map<string, string>()
  for (const other of term.courses) {
    if (other.id === course?.id) continue
    for (const meeting of other.meetings ?? [])
      busy.set(`${meeting.day}-${meeting.from}`, other.code)
  }
  const clashOf = (section: SidebarSection) =>
    section.meetings.map((m) => busy.get(`${m.day}-${m.from}`)).find(Boolean) ?? null
  const settled = stage === "registered" || stage === "progress" || stage === "taken"
  const canPick = (onPickSection != null || onAddSection != null) && !term.locked
  /* Listed from the start: the student's own class, and nothing else once
     they have one — the rest wait behind a link. Until a class is chosen,
     every one they can take; any with something in its way — not eligible,
     or a clash with the term — waits behind it, so what is listed has no error
     on it. A full one is only full, so it is listed and says so. */
  const picked = course?.section != null || settled
  const listed = (section: SidebarSection) =>
    section.code === course?.section || (!picked && heldBack(section, clashOf(section)) == null)
  const others = picked ? "other" : "ineligible"
  const visible = all ? sections : sections.filter(listed)
  const hidden = sections.length - sections.filter(listed).length

  return (
    <Fold title="Sections" open={open} onToggle={onToggle}>
      <div className="flex w-full flex-col gap-2">
        {visible.map((section) => {
          const chosen = section.code === course?.section
          return (
            <SectionRow
              key={section.code}
              section={section}
              chosen={chosen}
              why={chosen ? null : heldBack(section, clashOf(section))}
              canPick={canPick}
              onPick={() =>
                at.course
                  ? onPickSection?.(at, section.code, section.meetings)
                  : onAddSection?.(section.code, section.meetings)
              }
              onPreview={(on) =>
                at.course &&
                onPreviewSection?.(
                  at,
                  on ? { section: section.code, meetings: section.meetings } : null
                )
              }
            />
          )
        })}
        {/* Everything has something in its way: say so, rather than leave the
            list empty with only a link under it. */}
        {!all && !picked && visible.length === 0 && hidden > 0 && (
          <div className="w-full rounded-md border border-gray-40 bg-gray-0 px-4 py-3 text-body-md text-gray-100">
            You're not eligible for any section this term.
          </div>
        )}
        {hidden > 0 && (
          <button
            type="button"
            onClick={() => setAll((was) => !was)}
            aria-expanded={all}
            className="flex w-full cursor-pointer items-center gap-4 rounded-md border border-gray-40 bg-card px-4 py-3 text-left text-body-md text-gray-100 hover:bg-gray-5"
          >
            <Icon name={all ? "unfold-less" : "unfold-more"} size={16} className="shrink-0" />
            <span className="min-w-0 flex-1">
              {all ? "Hide" : "Show"} {others} sections
            </span>
          </button>
        )}
      </div>
    </Fold>
  )
}
