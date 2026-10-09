import { cn } from "cn"
import { createContext, useContext, useState } from "react"

import { Icon, type IconName } from "@/components/icon"
import { useCourseIssues } from "@/components/stellic/plan-issues"
import { Alert } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { CatalogEntry } from "@/data/catalog"
import {
  activityFor,
  courseDetail,
  meetingLines,
  prerequisiteCodes,
  type PrereqNode,
  type PrereqOption,
  type PrereqState,
  type Section as CourseSection,
} from "@/data/course-detail"
import {
  CREDIT_GROUP_LABEL,
  courseGroup,
  type Meeting,
  type PlannedCourse,
  type Term,
} from "@/data/plan"

/* The way out of a prerequisite tree. A course named in one is a course like
 * any other, so it opens like one — but the tree is drawn several components
 * deep, and threading a handler through every row of it would be its own
 * small mess. */
const OpenCode = createContext<((code: string) => void) | undefined>(undefined)

/** Stands in where there is no term, so the hook is called either way. */
const EMPTY_TERM: Term = { id: "", name: "", window: "", reviewed: false, state: "planned", courses: [] }

/* A course opened on its own, before it is anywhere in the plan: what it is,
 * which classes are on offer, and everything the audit knows about where it
 * would count. Built from the course sidebar, which is where the shape of it
 * comes from — heading, then one card of details, with the prerequisite tree
 * inside it. */

/* ------------------------------------------------------------- prereq marks */

/** The square beside a prerequisite, in the audit's own colours: filled where
 *  it is done, outlined where it is not, and quiet where it is a group rather
 *  than a course. */
function Mark({ state }: { state?: PrereqState }) {
  const style = {
    earned: "border-success-100 bg-success-5 text-success-100",
    progress: "border-success-100 bg-success-5 text-success-100",
    planned: "border-warning-50 bg-warning-5 text-warning-50",
    /* Asked for and not earned, or out of reach: red either way. Nothing
       started is neither — it is quiet rather than wrong. */
    remaining: "border-alert-50 bg-alert-5 text-alert-50",
    blocked: "border-alert-50 bg-alert-5 text-alert-50",
    neutral: "border-gray-60 bg-gray-5 text-gray-80",
  }[state ?? "remaining"]

  const glyph =
    state === "earned" ? "check" : state === "progress" ? "watch-later" : state === "planned" ? "check" : null

  return (
    <span
      className={cn(
        "flex size-[18px] shrink-0 items-center justify-center rounded-[3px] border",
        style
      )}
    >
      {glyph && <Icon name={glyph} size={12} />}
    </span>
  )
}

/** The lines running down the left of the tree: a stem where a branch carries
 *  on past this row, and an elbow where it stops here. */
function Trail({ prefix, connector }: { prefix: boolean[]; connector: "tee" | "elbow" }) {
  return (
    <span aria-hidden="true" className="flex shrink-0">
      {prefix.map((carry, i) => (
        <span key={i} className="relative w-[18px] shrink-0">
          {carry && <span className="absolute top-0 bottom-0 left-2 w-px bg-gray-40" />}
        </span>
      ))}
      <span className="relative w-[18px] shrink-0">
        {connector === "tee" ? (
          <>
            <span className="absolute inset-y-0 left-2 w-px bg-gray-40" />
            <span className="absolute top-[15px] left-2 h-px w-[10px] bg-gray-40" />
          </>
        ) : (
          /* The last child turns the corner rather than cutting it square. */
          <span className="absolute top-0 left-2 h-[15px] w-[10px] rounded-bl-[4px] border-b border-l border-gray-40" />
        )}
      </span>
    </span>
  )
}

type Row = { node: PrereqNode; prefix: boolean[]; last: boolean; root?: boolean }

/** The tree, flattened to rows that each know which lines to draw. */
function flatten(node: PrereqNode, prefix: boolean[], last: boolean, out: Row[]) {
  out.push({ node, prefix, last })
  const kids = node.open === false ? [] : (node.children ?? [])
  kids.forEach((kid, i) => flatten(kid, [...prefix, !last], i === kids.length - 1, out))
}

/* A course that asks for one thing only has no option to open, so its
 * requirements are the top of the tree rather than hanging off one. */
function flattenSole(node: PrereqNode, out: Row[]) {
  out.push({ node, prefix: [], last: true, root: true })
  const kids = node.open === false ? [] : (node.children ?? [])
  kids.forEach((kid, i) => flatten(kid, [], i === kids.length - 1, out))
}

function PrereqRow({ row }: { row: Row }) {
  const { node } = row
  const group = node.children != null
  /* Only where the page can find the course behind the code. */
  const open = useContext(OpenCode)

  return (
    <div className="flex items-stretch">
      {!row.root && <Trail prefix={row.prefix} connector={row.last ? "elbow" : "tee"} />}
      <div className="flex min-h-[30px] min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-[5px]">
        {!group && <Mark state={node.state} />}
        {node.code ? (
          <>
            {open ? (
              <button
                type="button"
                onClick={() => open(node.code!)}
                className={cn(
                  "shrink-0 cursor-pointer text-body-md text-gray-100",
                  "hover:underline hover:[text-underline-position:from-font]"
                )}
              >
                {node.code}
              </button>
            ) : (
              <span className="shrink-0 text-body-md text-gray-100">{node.code}</span>
            )}
            {node.note && <span className="text-label-md text-gray-80">{node.note}</span>}
          </>
        ) : (
          <span className="min-w-0 text-body-md text-gray-100">{node.label}</span>
        )}
        {node.meta && (
          <span
            className={cn(
              "ml-auto shrink-0 pl-2.5 text-label-md whitespace-nowrap",
              node.tone === "good"
                ? "text-success-100"
                : node.tone === "bad"
                  ? "text-alert-100"
                  : "text-gray-80"
            )}
          >
            {node.meta}
          </span>
        )}
      </div>
    </div>
  )
}

function Option({ option }: { option: PrereqOption }) {
  const [open, setOpen] = useState(option.open !== false)
  const rows: Row[] = []
  option.children.forEach((child, i) =>
    flatten(child, [], i === option.children.length - 1, rows)
  )

  return (
    <div className="flex w-full flex-col py-1">
      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        aria-expanded={open}
        disabled={option.children.length === 0}
        className={cn(
          "flex min-h-[30px] w-full cursor-pointer items-center gap-2 rounded-md px-1.5 py-[5px]",
          option.children.length > 0 && "hover:bg-gray-5"
        )}
      >
        <Mark state={option.state} />
        <span className="text-overline font-medium tracking-[0.5px] text-gray-100 uppercase">
          {option.name}
        </span>
        {option.children.length > 0 && (
          <Icon
            name={open ? "expand-more" : "chevron-right"}
            size={14}
            className="shrink-0 text-gray-80"
          />
        )}
        <span
          className={cn(
            "ml-auto shrink-0 pl-2.5 text-label-md whitespace-nowrap",
            option.tone === "good"
              ? "text-success-100"
              : option.tone === "bad"
                ? "text-alert-100"
                : "text-gray-80"
          )}
        >
          {option.meta}
        </span>
      </button>

      {!open && option.summary && (
        <p className="pb-1 pl-8 text-label-md text-gray-80">{option.summary}</p>
      )}

      {open && (
        /* 7px puts the first stem under the centre of the option's mark: 6px of
           the head's padding plus half of its 18px square, less the 8px the
           stem already sits in from the cell's edge. */
        <div className="flex flex-col pt-0.5 pl-[7px]">
          {rows.map((row, i) => (
            <PrereqRow key={i} row={row} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ panel */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex w-full flex-col gap-2">
      <h3 className="text-body-md font-semibold text-foreground">{title}</h3>
      {children}
    </div>
  )
}

/* One of the sidebar's own sections: a glyph naming it, and everything under
 * it, which folds away. The two that speak about the plan rather than about
 * the course start folded — they are there to be asked for. */
function Fold({
  icon,
  title,
  count,
  start = "open",
  children,
}: {
  icon: IconName
  title: string
  count?: number
  start?: "open" | "closed"
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(start === "open")

  return (
    <div className="flex w-full flex-col gap-4">
      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        aria-expanded={open}
        className="flex w-fit cursor-pointer items-center gap-2 text-left"
      >
        <Icon name={icon} size={16} className="shrink-0 text-gray-100" />
        <span className="text-caption-lg font-semibold text-gray-100">
          {title}
          {count != null && ` (${count})`}
        </span>
        <Icon
          name={open ? "expand-more" : "chevron-right"}
          size={16}
          className="shrink-0 text-gray-100"
        />
      </button>
      {open && children}
    </div>
  )
}

function Chips({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Badge key={item} variant="outline" className="font-semibold">
          {item}
        </Badge>
      ))}
    </div>
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
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="text-body-md font-semibold text-foreground">{label}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
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

/** One place the course sits in the plan: what it counts towards, or what it
 *  is holding up. */
function FitCard({ label, items, note }: { label: string; items: string[]; note?: string }) {
  return (
    <div className="flex w-full items-center gap-3 rounded-md border border-gray-40 bg-card p-4">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-body-md text-gray-80">{label}</span>
        {items.length > 1 ? (
          <ul className="list-disc pl-5">
            {items.map((item) => (
              <li key={item} className="text-body-md font-semibold text-gray-100">
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-body-md font-semibold text-gray-100">{items[0]}</span>
        )}
        {note && <span className="text-body-md text-gray-80">{note}</span>}
      </div>
      <Icon name="chevron-right" size={14} className="shrink-0 text-gray-100" />
    </div>
  )
}

/** One of the plan's own choices about a course, with the way to change it. */
function Property({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-body-md text-gray-80">{label}</span>
      <span className="flex min-w-0 items-center gap-2">
        <span className="min-w-0 truncate text-body-md text-gray-100">{value}</span>
        <a
          href="#"
          className="shrink-0 text-body-md text-gray-80 underline [text-underline-position:from-font]"
        >
          edit
        </a>
      </span>
    </div>
  )
}

export function CoursePanel({
  entry,
  terms,
  planned,
  plan,
  backLabel,
  onOpenCode,
  onAdd,
  onPickSection,
  onPreviewSection,
  onRemove,
  onBack,
  onClose,
}: {
  entry: CatalogEntry
  /** Where it could be planned: the terms that would take it. */
  terms: Term[]
  /** Opened from the plan rather than from the list: the course as it sits in
   *  a term, with the choices made about it and the class it is in. */
  planned?: { course: PlannedCourse; term: Term }
  /** Every term in the plan, which is where "where it fits" is read from: a
   *  course is a prerequisite for whatever the plan has put after it. */
  plan?: Term[]
  /** What the way back is to, where it is not a term. */
  backLabel?: string
  /** Opens a course the prerequisite tree names, where the plan can find it. */
  onOpenCode?: (code: string) => void
  onAdd: (termId: string) => void
  /** Settles this course — where the plan holds it — on one of the classes
   *  listed here, at the hours that class keeps. */
  onPickSection?: (section: string, meetings: Meeting[]) => void
  /** The class the cursor is over, for the week beside the panel to draw. Null
   *  when it leaves. */
  onPreviewSection?: (section: { section: string; meetings: Meeting[] } | null) => void
  onRemove?: () => void
  onBack: () => void
  onClose: () => void
}) {
  const detail = courseDetail(entry)

  /* One option is not a choice, so it is drawn as the requirements themselves
     rather than as something to pick. */
  const sole = detail.prerequisites.options.length === 1 ? detail.prerequisites.options[0] : null
  const soleRows: Row[] = []
  sole?.children.forEach((child) => flattenSole(child, soleRows))
  /* Where it fits: what it counts for, grouped under the thing it counts
     towards, and whatever the plan has put after it that asks for it. */
  const counting = detail.countsFor.reduce<Record<string, string[]>>((groups, row) => {
    groups[row.under] = [...(groups[row.under] ?? []), row.name]
    return groups
  }, {})
  /* Only the terms after the one holding it: a course holds up what comes
     after it, never what the student is already taking. */
  const held = plan?.findIndex((t) => t.id === planned?.term.id) ?? -1
  const unlocks = (plan ?? [])
    .filter((_, i) => held < 0 || i > held)
    .flatMap((t) => t.courses.map((course) => ({ course, term: t })))
    .filter(
      ({ course }) =>
        !course.placeholder &&
        course.code !== entry.code &&
        prerequisiteCodes(course.code).includes(entry.code)
    )
  /* A course it was moved from, where the plan has another term to have moved
     it from — which is what makes a history worth keeping. */
  const moved = planned
    ? (plan ?? terms).find((t) => t.id !== planned.term.id && !t.locked)?.name
    : undefined
  const activity = planned ? activityFor(entry.code, planned.term.name, moved) : []
  /* The credits are the student's already, which is what the green says. */
  const earned = planned?.term.state === "completed"
  /* Anything the plan has against this course sitting where it does. */
  const issues = useCourseIssues(planned?.term ?? EMPTY_TERM, planned?.course.id ?? "")
  /* A term that is finished or under way has no choice left in it: the class
     the student is in is the only one worth showing, read off the plan rather
     than off the catalogue, because that is where it is true. */
  const settled = planned != null && planned.term.locked === true
  const attending: CourseSection | null =
    settled && planned.course.section
      ? {
          code: planned.course.section,
          when: meetingLines(planned.course.meetings),
          who: planned.course.instructor ?? "",
          seats: "",
        }
      : null
  /* The class the student is in, as the plan has it. A term's schedule was
     drawn before anybody opened this panel, so the section it handed out is
     not always one of the ones the catalogue lists here — and a list of
     classes that leaves out the one you are in is the wrong list. */
  const mine: CourseSection | null =
    planned?.course.section && !detail.sections.some((s) => s.code === planned.course.section)
      ? {
          code: planned.course.section,
          when: meetingLines(planned.course.meetings),
          meetings: planned.course.meetings,
          who: planned.course.instructor ?? "",
          seats: "",
        }
      : null
  const sections = settled
    ? attending
      ? [attending]
      : []
    : mine
      ? [mine, ...detail.sections]
      : detail.sections
  /* Choosing one is only a thing to do where the plan holds the course and the
     term still takes changes. */
  const choosing = onPickSection != null && planned != null && !planned.term.locked
  /* The hours the rest of the term already keeps, so a class that cannot be
     attended is listed rather than offered. */
  const busy = new Map<string, string>()
  for (const other of planned?.term.courses ?? []) {
    if (other.id === planned?.course.id) continue
    for (const meeting of other.meetings ?? []) {
      busy.set(`${meeting.day}-${meeting.from}`, other.code)
    }
  }
  const clashOf = (section: CourseSection) =>
    (section.meetings ?? []).map((m) => busy.get(`${m.day}-${m.from}`)).find(Boolean) ?? null

  const [campus, setCampus] = useState(detail.campus)
  const [termId, setTermId] = useState(terms[0]?.id ?? "")
  const [more, setMore] = useState(false)
  /* Whether the foot card — planning this course again elsewhere — is open. */
  const [again, setAgain] = useState(false)
  const term = planned?.term ?? terms.find((t) => t.id === termId)

  return (
    <OpenCode.Provider value={onOpenCode}>
    <aside className="flex h-full w-full flex-col gap-4 overflow-x-clip overflow-y-auto bg-background p-6 pb-28">
      <div className="flex w-full shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-body-md text-gray-80"
        >
          <Icon name="chevron-left" size={14} className="shrink-0" />
          <span className="min-w-0 truncate text-left">
            Back to {planned ? planned.term.name : (backLabel ?? "remaining courses")}
          </span>
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close course"
          className="shrink-0 cursor-pointer rounded-md text-gray-100"
        >
          <Icon name="close" size={24} />
        </button>
      </div>

      {/* What it is. */}
      <div className="flex w-full items-center gap-6 rounded-md bg-card p-6 shadow-sm">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h2 className="text-h400 font-semibold text-gray-100">{entry.name}</h2>
          <div className="flex flex-wrap items-center gap-4 text-body-md text-gray-80">
            <span>{entry.code}</span>
            <span className="flex items-center gap-2">
              <Icon name="watch-later" size={14} />
              {detail.credits} Credits
            </span>
          </div>
        </div>
        <Button size="icon" aria-label="Save course" className="shrink-0">
          <Icon name="outlined-flag" size={16} />
        </Button>
      </div>

      <div className="flex w-full flex-col rounded-md bg-card shadow-sm">
        {planned ? (
          /* A course already in the plan is headed by the term holding it and
             the class it is in, on the blue the plan uses for the term a thing
             belongs to. */
          <div className="flex w-full items-center gap-4 rounded-t-md bg-primary-0 p-6">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <p className="flex flex-wrap items-center gap-2">
                <span className="text-caption-lg font-semibold text-gray-100">
                  {planned.term.name}
                </span>
                {/* Green where the credits are already the student's, amber
                    while they are only promised. */}
                <Badge variant={earned ? "success" : "warning"}>
                  {CREDIT_GROUP_LABEL[courseGroup(planned.term, planned.course)]}
                </Badge>
              </p>
              <p className="flex flex-wrap items-center gap-4 text-body-md text-gray-80">
                <span>Topic: {planned.course.topic ?? "General"}</span>
                {planned.course.section && (
                  <span className="flex items-center gap-2">
                    <Icon name="calendar-today" size={14} />
                    {planned.course.section}
                  </span>
                )}
              </p>
            </div>
            <span className="flex shrink-0 items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm">Actions</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[180px]">
                  <DropdownMenuItem className="gap-2 py-1.5 text-body-md">
                    <Icon name="sticky-note-2" size={16} />
                    Write a note
                  </DropdownMenuItem>
                  {/* A course already taken cannot be taken back out. */}
                  {onRemove && (
                    <DropdownMenuItem onSelect={onRemove} className="gap-2 py-1.5 text-body-md">
                      <Icon name="close" size={16} />
                      Remove from plan
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <Icon name="unfold-less" size={16} className="text-gray-100" />
            </span>
          </div>
        ) : (
          <div className="flex w-full items-center justify-between gap-4 border-b border-gray-40 p-6">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <p className="text-caption-lg font-semibold text-gray-100">Course Details</p>
              <p className="text-body-md text-gray-80">
                Plan this course for a current or upcoming semester
              </p>
            </div>
            <Icon name="unfold-less" size={16} className="shrink-0 text-gray-100" />
          </div>
        )}

        <div className="flex w-full flex-col gap-6 p-6">
          {/* What the plan has to say about this course being here, above
              everything the catalogue has to say about the course. */}
          {issues.map((issue, i) => (
            <Alert
              key={`${issue.kind}-${i}`}
              variant={issue.severity === "error" ? "danger" : "warning"}
              className="items-start gap-3 p-[15px]"
            >
              <Icon
                name={issue.severity === "error" ? "error-outline" : "warning"}
                size={16}
                className={cn(
                  "mt-0.5 shrink-0",
                  issue.severity === "error" ? "text-alert-100" : "text-warning-50"
                )}
              />
              <span className="min-w-0 flex-1 text-body-md text-gray-100">{issue.says}</span>
            </Alert>
          ))}

          {planned ? (
            <Fold icon="settings" title="Planning details">
              {/* What the plan chose about it, each changeable on its own. */}
              <div className="grid w-full grid-cols-2 gap-4 @sm:grid-cols-3">
                <Property label="Campus" value={planned.course.campus ?? "Main"} />
                <Property label="Topic" value={planned.course.topic ?? "General"} />
                <Property label="Sub-term" value={planned.course.subTerm ?? "Full Term"} />
                <Property label="Level" value="Undergraduate" />
                <Property label="Units" value={String(planned.course.credits)} />
                <Property label="Grading Option" value={planned.course.gradeOption ?? "Graded"} />
              </div>
            </Fold>
          ) : (
            /* Where and when it would be taken, and the way to put it there. */
            <div className="flex w-full flex-wrap items-end gap-4">
              <Picker
                label="Campus"
                value={campus}
                options={["Main", "Downtown"]}
                onChange={setCampus}
              />
              <Picker
                label="Term"
                value={term?.name ?? "No term"}
                options={terms.map((t) => t.name)}
                onChange={(name) => setTermId(terms.find((t) => t.name === name)?.id ?? termId)}
              />
              <Button
                variant="primary"
                disabled={!term}
                onClick={() => term && onAdd(term.id)}
                className="shrink-0"
              >
                Add to Plan
              </Button>
            </div>
          )}

          <Fold icon="calendar-month" title="Sections" count={sections.length}>
            <div className="flex w-full flex-col gap-2">
              {sections.map((section) => {
                /* The one the student is in is marked rather than offered. */
                const chosen = planned?.course.section === section.code
                const clash = chosen ? null : clashOf(section)
                /* Their own class is drawn at the hours they keep, which is
                   the plan's answer rather than the catalogue's. */
                const when =
                  chosen && planned?.course.meetings
                    ? meetingLines(planned.course.meetings)
                    : section.when
                return (
                <div
                  key={section.code}
                  /* The whole row answers the cursor: the week beside it draws
                     this class where it would go, which is the question
                     somebody reading a list of times is actually asking. */
                  onMouseEnter={() =>
                    onPreviewSection?.(
                      section.meetings
                        ? { section: section.code, meetings: section.meetings }
                        : null
                    )
                  }
                  onMouseLeave={() => onPreviewSection?.(null)}
                  className={cn(
                    "flex w-full items-stretch rounded-md border bg-card transition-colors",
                    chosen ? "border-primary-50 bg-primary-0/40" : "border-gray-40 hover:bg-gray-0"
                  )}
                >
                  <button
                    type="button"
                    disabled={!choosing || chosen || clash != null}
                    onClick={() => onPickSection?.(section.code, section.meetings ?? [])}
                    aria-label={
                      chosen ? `${section.code} is your class` : `Add ${section.code} to plan`
                    }
                    className={cn(
                      "flex items-center border-r px-3",
                      chosen
                        ? "border-primary-50 text-primary-50"
                        : "border-gray-40 text-gray-100",
                      choosing && !chosen && clash == null
                        ? "cursor-pointer hover:bg-gray-5"
                        : "cursor-default",
                      clash != null && "text-gray-60"
                    )}
                  >
                    <Icon name={chosen ? "check" : "add"} size={16} />
                  </button>
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3 p-3">
                    <span className="w-[50px] shrink-0 text-body-md font-semibold text-gray-100">
                      {section.code}
                    </span>
                    <span className="min-w-0 flex-1 text-body-md text-gray-100">
                      {when.map((line) => (
                        <span key={line} className="block">
                          {line}
                        </span>
                      ))}
                    </span>
                    <span className="shrink-0 text-body-md text-gray-80">{section.who}</span>
                    {/* A class you are already in has no seat count worth
                        reading: you have one. What clashes has seats and is
                        still no use, so it says what it clashes with. */}
                    {clash != null ? (
                      <span className="shrink-0 text-body-md text-gray-80">
                        Clashes with {clash}
                      </span>
                    ) : (
                      section.seats && (
                        <span className="shrink-0 text-body-md text-success-100">
                          {section.seats}
                        </span>
                      )
                    )}
                  </div>
                </div>
                )
              })}

              {/* What else has seats is only worth saying where there is still
                  a class to choose. */}
              {!settled && (
                <p className="flex w-full items-center gap-3 rounded-md border border-gray-40 bg-card p-3 text-body-md text-gray-80">
                  <Icon name="unfold-more" size={16} className="shrink-0 text-gray-100" />
                  Showing sections with seat availability, see {detail.hidden} more available section
                  {detail.hidden === 1 ? "" : "s"}
                </p>
              )}
            </div>
          </Fold>

          <Fold icon="info" title="Description">
            <div className="flex w-full flex-col gap-2">
              <p className="text-body-md text-gray-80">
                {more ? detail.description : `${detail.description.slice(0, 180)}…`}
              </p>
              <button
                type="button"
                onClick={() => setMore((was) => !was)}
                className="w-fit cursor-pointer text-body-md text-gray-100 underline [text-underline-position:from-font]"
              >
                {more ? "Show less" : "Show more"}
              </button>
            </div>
          </Fold>

          {/* Everything the catalogue says about it, which is one section
              rather than seven. */}
          <Fold icon="description" title="Course details">
          <div className="flex w-full flex-col gap-8">
            <Section title={`Attributes (${detail.attributes.length})`}>
              <Chips items={detail.attributes} />
            </Section>

            <Section title={`Topics (${detail.topics.length})`}>
              <Chips items={detail.topics} />
            </Section>

            <Section title="Required Sections">
              <ul className="list-disc pl-5 text-body-md text-gray-100">
                {detail.requiredSections.map((row) => (
                  <li key={row.kind}>
                    {row.kind}: {row.available} available
                  </li>
                ))}
              </ul>
            </Section>

            <Section title={`Instructors (${detail.instructors.length})`}>
              <div className="flex w-full flex-col gap-4">
                {detail.instructors.map((person) => (
                  <div key={person.name} className="flex items-start gap-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gray-40 text-caption-lg text-white">
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
                      <span className="text-body-md text-gray-80">
                        {person.semesters} semesters
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Course Equivalents">
              <Chips items={detail.equivalents} />
            </Section>

            {/* Where a course is not in the plan there is no "where it fits"
                section to put this in, so it stays with the catalogue. */}
            {!planned && (
              <Section title="Can count for">
                <ul className="list-disc pl-5 text-body-md text-gray-100">
                  {detail.countsFor.map((row) => (
                    <li key={row.name}>
                      {row.name}
                      <br />
                      <span className="text-gray-80">{row.under}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            <Section title="Repeatable">
              <p className="text-body-md text-gray-80">{detail.repeatable}</p>
            </Section>
          </div>
          </Fold>

          {/* What has to be true before it can be taken, as a tree: the
              options, and inside each the courses and conditions it asks
              for, with what the audit makes of them. */}
          <Fold icon="link" title="Requisites">
            <div className="flex w-full flex-col gap-3">
              <div className="flex w-full flex-col gap-0.5">
                <div className="flex w-full items-center justify-between gap-3">
                  <h3 className="text-body-md font-semibold text-foreground">Prerequisites</h3>
                  <span className="shrink-0 text-label-md text-gray-80">
                    Evaluated for {term?.name ?? "this plan"}
                  </span>
                </div>
                {/* Said only where there is a choice to make. One way in needs
                    no directive, and none at all needs no tree. */}
                {detail.prerequisites.directive && (
                  <p className="text-body-md text-gray-100">{detail.prerequisites.directive}</p>
                )}
              </div>
              {sole ? (
                <div className="flex w-full flex-col">
                  {soleRows.map((row, i) => (
                    <PrereqRow key={i} row={row} />
                  ))}
                </div>
              ) : detail.prerequisites.options.length === 0 ? (
                <p className="text-body-md text-gray-80">This course has no prerequisites.</p>
              ) : (
                <div className="flex w-full flex-col">
                  {detail.prerequisites.options.map((option) => (
                    <Option key={option.name} option={option} />
                  ))}
                </div>
              )}
            </div>
          </Fold>

          {planned && (
            /* What the plan is holding this course for: the requirements it
               answers, and whatever has been put after it that asks for it. */
            <Fold icon="help-outline" title="Where it fits in your plan" start="closed">
              <div className="flex w-full flex-col gap-2">
                {Object.entries(counting).map(([under, names]) => (
                  <FitCard key={under} label={`Counting for ${under}`} items={names} />
                ))}
                {unlocks.map(({ course, term: after }) => (
                  <FitCard
                    key={course.id}
                    label="Is a pre-requisite for"
                    items={[`${course.code}: ${course.name}`]}
                    note={`In ${after.name}`}
                  />
                ))}
              </div>
            </Fold>
          )}

          {planned && (
            /* Every time the course moved, and who moved it. */
            <Fold icon="history" title="Activity history" count={activity.length} start="closed">
              <div className="flex w-full flex-col gap-4">
                {activity.map((event, i) => (
                  <div key={i} className="flex w-full items-start gap-2">
                    <Icon
                      name={event.kind === "add" ? "add" : "close"}
                      size={16}
                      className={cn(
                        "mt-0.5 shrink-0",
                        event.kind === "add" ? "text-success-100" : "text-alert-100"
                      )}
                    />
                    <span className="flex min-w-0 flex-col">
                      <span className="text-body-md text-gray-100">
                        {event.kind === "add" ? "Added to" : "Removed from"} {event.term}
                      </span>
                      <span className="text-body-md text-gray-80">
                        {event.when} by {event.who}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </Fold>
          )}
        </div>
      </div>

      {planned && (
        /* Already planned once, so what is left to offer is planning it again:
           the card that heads an unplanned course goes to the foot here, folded
           away until it is asked for. */
        <div className="flex w-full flex-col rounded-md bg-card shadow-sm">
          <button
            type="button"
            onClick={() => setAgain((was) => !was)}
            aria-expanded={again}
            className="flex w-full cursor-pointer items-center gap-4 p-6 text-left"
          >
            <span className="flex min-w-0 flex-1 flex-col gap-2">
              <span className="text-caption-lg font-semibold text-gray-100">Course Details</span>
              <span className="text-body-md text-gray-80">
                Plan this course again for a current or upcoming semester
              </span>
            </span>
            <Icon
              name={again ? "unfold-less" : "unfold-more"}
              size={16}
              className="shrink-0 text-gray-100"
            />
          </button>

          {again && (
            <div className="flex w-full flex-wrap items-end gap-4 px-6 pb-6">
              <Picker
                label="Campus"
                value={campus}
                options={["Main", "Downtown"]}
                onChange={setCampus}
              />
              <Picker
                label="Term"
                value={terms.find((t) => t.id === termId)?.name ?? "No term"}
                options={terms.map((t) => t.name)}
                onChange={(name) => setTermId(terms.find((t) => t.name === name)?.id ?? termId)}
              />
              <Button
                variant="primary"
                disabled={!termId}
                onClick={() => termId && onAdd(termId)}
                className="shrink-0"
              >
                Add to Plan
              </Button>
            </div>
          )}
        </div>
      )}
    </aside>
    </OpenCode.Provider>
  )
}
