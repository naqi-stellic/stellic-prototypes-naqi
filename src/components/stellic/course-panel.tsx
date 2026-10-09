import { cn } from "cn"
import { useState, type ReactNode } from "react"

import { Icon, type IconName } from "@/components/icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
  type Step,
} from "@/data/course-sidebar"
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
function Fold({
  title,
  summary,
  extra,
  open,
  onToggle,
  children,
}: {
  title: string
  /** Said beside the title, so a folded section still answers its question. */
  summary?: ReactNode
  /** A control that sits with the chevron rather than in the body. */
  extra?: ReactNode
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <section className="flex w-full flex-col border-t border-gray-40">
      <div className="flex w-full items-center gap-2 px-6 py-4">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="min-w-0 flex-1 cursor-pointer text-left text-caption-lg font-semibold text-gray-100"
        >
          {title}
        </button>
        {summary}
        {extra}
        <button
          type="button"
          onClick={onToggle}
          aria-label={`${open ? "Collapse" : "Expand"} ${title}`}
          className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-gray-100 hover:bg-gray-5"
        >
          <Icon name={open ? "unfold-less" : "unfold-more"} size={16} />
        </button>
      </div>
      {open && <div className="flex w-full flex-col gap-4 px-6 pb-4">{children}</div>}
    </section>
  )
}

function Heading({ children }: { children: ReactNode }) {
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
  onChange,
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

/** Which glyph and colour a tab carries for the point its course is at, so
 *  the tabs say which attempt is which before any of them is opened. */
const TAB_MARK: Record<Stage, { icon: IconName; tone: string }> = {
  planned: { icon: "check", tone: "text-warning-100" },
  registered: { icon: "event-available", tone: "text-warning-100" },
  progress: { icon: "watch-later", tone: "text-success-100" },
  taken: { icon: "check", tone: "text-success-100" },
}

const CATALOG = "catalog"

const keyOf = ({ course, term }: Instance) => `${term.id}:${course.id}`

/* --------------------------------------------------------------- checklist */

const STEP_MARK: Record<Step["state"], ReactNode> = {
  done: <Icon name="check-circle" size={16} className="shrink-0 text-success-100" />,
  current: <span className="size-4 shrink-0 rounded-full border-2 border-warning-100" />,
  todo: <span className="size-4 shrink-0 rounded-full border-2 border-gray-60" />,
  blocked: <Icon name="error-outline" size={16} className="shrink-0 text-alert-100" />,
}

function Checklist({ steps }: { steps: Step[] }) {
  return (
    <ol className="flex w-full flex-col gap-3">
      {steps.map((step) => (
        <li key={step.label} className="flex w-full items-center gap-2 text-body-md text-gray-100">
          {STEP_MARK[step.state]}
          <span className="min-w-0 flex-1">{step.label}</span>
          {step.chip && (
            <span className="flex shrink-0 items-center gap-1 rounded-md bg-gray-5 px-1.5 py-0.5 text-label-md text-gray-100">
              <Icon name="timer" size={12} />
              {step.chip}
            </span>
          )}
        </li>
      ))}
    </ol>
  )
}

/* ---------------------------------------------------------------- sections */

/** Why a section is left out of the list until it is asked for. Full or held
 *  for students who meet something more, a section can still be chosen —
 *  registering for a full one puts the student on its waitlist. */
function heldBack(section: SidebarSection, clash: string | null): string | null {
  if (!section.eligible) return "Section eligibility criteria not met"
  if (clash) return `Clashes with ${clash}`
  return null
}

function SectionDetail({ section }: { section: SidebarSection }) {
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
            {section.eligible ? "Met" : "Not met"}
          </Badge>
        </span>
        {section.eligible ? (
          <p className="text-body-md text-gray-80">No requirements beyond the course's own.</p>
        ) : (
          <ul className="flex list-disc flex-col gap-2 pl-5 text-body-md text-gray-100">
            <li>Registration disallowed for this section</li>
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
  onPreview,
}: {
  section: SidebarSection
  chosen: boolean
  /** Why the row is held back, said under its hours. */
  why: string | null
  canPick: boolean
  onPick: () => void
  onPreview?: (on: boolean) => void
}) {
  const [open, setOpen] = useState(false)
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
              {section.available}/{section.capacity}
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
  onAdd,
  onPickSection,
  onPreviewSection,
  onRemove,
  onRegister,
  onBack,
  onClose,
}: {
  entry: CatalogEntry
  /** Where it could be planned: the terms that would take it. */
  terms: Term[]
  /** Every term in the plan: where the course already sits, and what the rest
   *  of each term keeps, so a section that clashes can say so. */
  plan: Term[]
  /** The place in the plan it was opened from, where it was opened from one. */
  opened?: Instance
  /** What the way back is to. */
  backLabel: string
  onAdd: (termId: string) => void
  /** Settles one instance on a section. */
  onPickSection?: (at: Instance, section: string, meetings: Meeting[]) => void
  /** The section the cursor is over, for a week beside the panel to draw. */
  onPreviewSection?: (at: Instance, hovered: { section: string; meetings: Meeting[] } | null) => void
  /** Takes one instance out of the plan, where its term still takes changes. */
  onRemove?: (at: Instance) => void
  /** Opens the term's registration. */
  onRegister?: (term: Term) => void
  onBack: () => void
  onClose: () => void
}) {
  const detail = courseDetail(entry)
  const instances = instancesOf(entry.code, plan)
  /* Opened from the plan, on the attempt that was clicked; from anywhere else,
     on the newest attempt where there is one, and on the catalogue where not. */
  const [tab, setTab] = useState(
    opened ? keyOf(opened) : instances[0] ? keyOf(instances[0]) : CATALOG
  )
  const current = instances.find((instance) => keyOf(instance) === tab) ?? null
  const shown = current ?? (tab === CATALOG ? null : instances[0] ?? null)
  const [saved, setSaved] = useState(false)

  return (
    <aside className="flex h-full w-full flex-col overflow-x-clip overflow-y-auto bg-card pb-28">
      <div className="flex w-full shrink-0 items-center gap-2 border-b border-gray-40 px-6 py-4">
        <button
          type="button"
          onClick={onBack}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-body-md font-medium text-gray-80"
        >
          <Icon name="chevron-left" size={16} className="shrink-0" />
          <span className="min-w-0 truncate text-left">Back to {backLabel}</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close course"
          className="shrink-0 cursor-pointer rounded-md text-gray-100"
        >
          <Icon name="close" size={20} />
        </button>
      </div>

      <div className="flex w-full items-start gap-4 px-6 pt-6 pb-4">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h2 className="text-h400 font-semibold text-gray-100">{entry.name}</h2>
          <p className="flex flex-wrap items-center gap-4 text-body-md text-gray-80">
            <span>{entry.code}</span>
            <span className="flex items-center gap-1">
              <Icon name="watch-later" size={14} />
              {detail.credits} Credits
            </span>
          </p>
        </div>
        <Button
          size="icon"
          aria-label={saved ? "Remove bookmark" : "Bookmark course"}
          aria-pressed={saved}
          onClick={() => setSaved((was) => !was)}
          className="shrink-0"
        >
          <Icon name={saved ? "bookmark" : "bookmark-border"} size={16} />
        </Button>
      </div>

      <div role="tablist" aria-label="Where this course is" className="flex w-full flex-wrap gap-1 px-6">
        {instances.map((instance) => {
          const mark = TAB_MARK[stageOf(instance.term, instance.course)]
          const key = keyOf(instance)
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-t-md px-3 py-2 text-body-md text-gray-100",
                tab === key ? "bg-gray-0" : "hover:bg-gray-5"
              )}
            >
              <Icon name={mark.icon} size={16} className={mark.tone} />
              {instance.term.name}
            </button>
          )
        })}
        <button
          type="button"
          role="tab"
          aria-selected={tab === CATALOG}
          onClick={() => setTab(CATALOG)}
          className={cn(
            "flex cursor-pointer items-center gap-2 rounded-t-md px-3 py-2 text-body-md text-gray-100",
            tab === CATALOG ? "bg-gray-0" : "hover:bg-gray-5"
          )}
        >
          <Icon name="menu-book" size={16} />
          Catalog
        </button>
      </div>

      {/* Keyed on the tab, so each one opens the sections its own point in
          the course's life calls for rather than whatever the last tab left
          open. */}
      {shown && tab !== CATALOG ? (
        <InstanceBody
          key={keyOf(shown)}
          entry={entry}
          at={shown}
          plan={plan}
          onPickSection={onPickSection}
          onPreviewSection={onPreviewSection}
          onRemove={onRemove}
          onRegister={onRegister}
        />
      ) : (
        <CatalogBody key={CATALOG} entry={entry} terms={terms} onAdd={onAdd} />
      )}
    </aside>
  )
}

/* -------------------------------------------------------- the shared folds */

function EligibilityFold({
  entry,
  open,
  onToggle,
}: {
  entry: CatalogEntry
  open: boolean
  onToggle: () => void
}) {
  const { met, lines } = eligibility(entry)
  return (
    <Fold
      title="Eligibility"
      summary={<Badge variant={met ? "success" : "danger"}>{met ? "Met" : "Not Met"}</Badge>}
      open={open}
      onToggle={onToggle}
    >
      <div className="flex w-full flex-col gap-3">
        <Heading>Prerequisites</Heading>
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
    </Fold>
  )
}

function CountingFold({
  entry,
  title,
  unmatched,
  open,
  onToggle,
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
              <a
                href="/explain.html"
                className="underline [text-underline-position:from-font]"
              >
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
  onToggle,
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
        <div className="flex flex-col gap-1">
          <Heading>Repeatable</Heading>
          <p className="text-body-md text-gray-80">{detail.repeatable}</p>
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
  onAdd,
}: {
  entry: CatalogEntry
  terms: Term[]
  onAdd: (termId: string) => void
}) {
  const { met } = eligibility(entry)
  const [campus, setCampus] = useState(courseDetail(entry).campus)
  const [termId, setTermId] = useState(terms[0]?.id ?? "")
  const term = terms.find((t) => t.id === termId)
  const [open, setOpen] = useState({ eligibility: !met, counting: false, about: met })
  const toggle = (key: keyof typeof open) => setOpen((was) => ({ ...was, [key]: !was[key] }))

  return (
    <>
      <div className="mx-6 mb-6 flex flex-col gap-4 rounded-b-md rounded-tr-md bg-gray-0 p-4">
        <Picker label="Campus" value={campus} options={["Main", "Downtown"]} onChange={setCampus} />
        <div className="flex flex-col gap-2">
          <Picker
            label="Term"
            value={term?.name ?? "No term"}
            options={terms.map((t) => t.name)}
            onChange={(name) => setTermId(terms.find((t) => t.name === name)?.id ?? termId)}
          />
          <span className="text-body-md text-gray-80">
            Usually offered: {usuallyOffered(entry.code)}
          </span>
        </div>
        {term && (
          <Button variant="primary" className="w-fit" onClick={() => onAdd(term.id)}>
            Add to Plan
          </Button>
        )}
      </div>
      <EligibilityFold entry={entry} open={open.eligibility} onToggle={() => toggle("eligibility")} />
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

/* ------------------------------------------------------------ instance tab */

/** One place the course sits in the plan, read at the point it is at. */
function InstanceBody({
  entry,
  at,
  plan,
  onPickSection,
  onPreviewSection,
  onRemove,
  onRegister,
}: {
  entry: CatalogEntry
  at: Instance
  plan: Term[]
  onPickSection?: (at: Instance, section: string, meetings: Meeting[]) => void
  onPreviewSection?: (at: Instance, hovered: { section: string; meetings: Meeting[] } | null) => void
  onRemove?: (at: Instance) => void
  onRegister?: (term: Term) => void
}) {
  const { course, term } = at
  const stage = stageOf(term, course)
  const { met } = eligibility(entry)
  const grade = gradeOf(course)
  /* A failed attempt counts for nothing; the retake is the one that does. */
  const unmatched = stage === "taken" && grade === "F"
  const sectionsOut = term.scheduled === true || term.locked === true
  const planning = stage === "planned" || stage === "registered"
  const [open, setOpen] = useState({
    checklist: planning,
    sections: planning && sectionsOut,
    canvas: stage === "progress",
    eligibility: planning && !met,
    counting: stage === "taken",
    about: false,
    history: false,
  })
  const toggle = (key: keyof typeof open) => setOpen((was) => ({ ...was, [key]: !was[key] }))
  const [campus, setCampus] = useState(course.campus ?? "Main")
  const [editingCampus, setEditingCampus] = useState(false)
  /* Register Now is there only while the window is open and there is a class
     to register for — never greyed out ahead of either. */
  const canRegister = stage === "planned" && term.alert != null && course.section != null
  const canRemove = onRemove != null && !term.locked && stage !== "taken"
  const moved = plan.find((t) => t.id !== term.id && !t.locked)?.name
  const activity = activityFor(entry.code, term.name, moved)

  return (
    <>
      <div className="mx-6 mb-6 flex flex-col gap-3 rounded-b-md rounded-tr-md bg-gray-0 p-4">
        <div className="flex w-full items-center gap-2">
          <h3 className="min-w-0 flex-1 text-caption-lg font-semibold text-gray-100">
            {STAGE_LABEL[stage]}
          </h3>
          {canRegister && (
            <Button variant="primary" onClick={() => onRegister?.(term)}>
              Register Now
            </Button>
          )}
          {stage !== "taken" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>Actions</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[180px]">
                <DropdownMenuItem className="gap-2 py-1.5 text-body-md">
                  <Icon name="sticky-note-2" size={16} />
                  Write a note
                </DropdownMenuItem>
                {canRemove && (
                  <DropdownMenuItem
                    onSelect={() => onRemove?.(at)}
                    className="gap-2 py-1.5 text-body-md"
                  >
                    <Icon name="close" size={16} />
                    Remove from plan
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {(stage === "progress" || stage === "taken") && (
          <div className="flex w-full items-center gap-4 text-body-md">
            <span className="w-14 shrink-0 font-semibold text-gray-100">Grade</span>
            <span className="flex min-w-0 flex-1 items-center gap-1 text-caption-lg font-semibold text-gray-100">
              {/* Provisional while the course runs; final once it is done. */}
              {stage === "progress" && <Icon name="timelapse" size={16} />}
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
          <span className="w-14 shrink-0 font-semibold text-gray-100">Campus</span>
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
              className="shrink-0 cursor-pointer text-gray-100 underline [text-underline-position:from-font]"
            >
              edit
            </button>
          )}
        </div>
      </div>

      {planning && (
        <Fold title="Planning checklist" open={open.checklist} onToggle={() => toggle("checklist")}>
          <Checklist steps={planningChecklist(term, course, met)} />
        </Fold>
      )}

      {(stage === "progress" || stage === "taken") && (
        <Fold title="Canvas Activity" open={open.canvas} onToggle={() => toggle("canvas")}>
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

      <EligibilityFold entry={entry} open={open.eligibility} onToggle={() => toggle("eligibility")} />
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
}: {
  entry: CatalogEntry
  at: Instance
  stage: Stage
  open: boolean
  onToggle: () => void
  onPickSection?: (at: Instance, section: string, meetings: Meeting[]) => void
  onPreviewSection?: (at: Instance, hovered: { section: string; meetings: Meeting[] } | null) => void
}) {
  const { course, term } = at
  const [all, setAll] = useState(false)
  /* The class the plan has the student in, where the catalogue's list does
     not happen to include it: a list that leaves out your own class is the
     wrong list. */
  const catalog = sectionsFor(entry)
  const own: SidebarSection | null = course.section
    ? {
        ...(catalog.find((s) => s.code === course.section) ?? catalog[0]),
        code: course.section,
        /* Drawn at the hours the plan has it at, which is where it is true. */
        meetings: course.meetings ?? [],
        when: meetingLines(course.meetings),
        instructors: course.instructor ? [course.instructor] : catalog[0].instructors,
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
    if (other.id === course.id) continue
    for (const meeting of other.meetings ?? []) busy.set(`${meeting.day}-${meeting.from}`, other.code)
  }
  const clashOf = (section: SidebarSection) =>
    section.meetings.map((m) => busy.get(`${m.day}-${m.from}`)).find(Boolean) ?? null
  const settled = stage === "registered" || stage === "progress" || stage === "taken"
  const canPick = onPickSection != null && !term.locked
  /* Listed from the start: the student's own class, and — while there is
     still a class to choose — every one they can take and get a seat in. */
  const listed = (section: SidebarSection) =>
    section.code === course.section ||
    (!settled && section.available > 0 && heldBack(section, clashOf(section)) == null)
  const visible = all ? sections : sections.filter(listed)
  const hidden = sections.length - sections.filter(listed).length

  return (
    <Fold
      title="Sections"
      extra={
        <button
          type="button"
          onClick={() => setAll((was) => !was)}
          aria-pressed={all}
          aria-label={all ? "Show only available sections" : "Show all sections"}
          className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-gray-100 hover:bg-gray-5"
        >
          <Icon name="filter-alt" size={16} />
        </button>
      }
      open={open}
      onToggle={onToggle}
    >
      <div className="flex w-full flex-col gap-2">
        {visible.map((section) => {
          const chosen = section.code === course.section
          return (
            <SectionRow
              key={section.code}
              section={section}
              chosen={chosen}
              why={chosen ? null : heldBack(section, clashOf(section))}
              canPick={canPick}
              onPick={() => onPickSection?.(at, section.code, section.meetings)}
              onPreview={(on) =>
                onPreviewSection?.(at, on ? { section: section.code, meetings: section.meetings } : null)
              }
            />
          )
        })}
        {hidden > 0 && (
          <button
            type="button"
            onClick={() => setAll((was) => !was)}
            aria-expanded={all}
            className="flex w-full cursor-pointer items-center gap-4 rounded-md border border-gray-40 bg-card px-4 py-3 text-left text-body-md text-gray-100 hover:bg-gray-5"
          >
            <Icon name={all ? "unfold-less" : "unfold-more"} size={16} className="shrink-0" />
            <span className="min-w-0 flex-1">
              {all
                ? `Showing all ${sections.length} sections`
                : settled
                  ? `Showing registered section, see ${hidden} more available`
                  : `Showing sections based on eligibility, planning details, seat availability, see ${hidden} more available`}
            </span>
          </button>
        )}
      </div>
    </Fold>
  )
}
