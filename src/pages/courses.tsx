import { useState, type ReactNode } from "react"

import { Icon } from "@/components/icon"
import { AppShell } from "@/components/layout/app-shell"
import { AuditCard, AuditTree, UnmatchedSection } from "@/components/stellic/audit-tree"
import { RecordTabs } from "@/components/stellic/staff-chrome"
import {
  AuditControls,
  NetworkRow,
  ProfileCard,
  TermStrip,
} from "@/components/stellic/student-profile"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AUDIT,
  AUDIT_STUDENT,
  AUDIT_TABS,
  AUDIT_VIEWS,
  LAST_COMPUTED,
  UNMATCHED_BLURB,
  unmatchedAgainst,
} from "@/data/audit"
import {
  RECORD_FOOTNOTE,
  RECORD_TERMS,
  RECORD_TRANSFER,
  type RecordRow,
  type TermContext,
} from "@/data/record-courses"
import { cn } from "cn"

/* Courses — the student's record by term.
 *
 * The same record page as Progress, on its third tab. Progress asks what the
 * degree accepts; Courses asks what the student has taken, when, and for what
 * grade — the transcript, with the plan's terms after it. Both tabs are live
 * and read one record, so a course can be followed from one to the other and
 * says the same thing on both. */

const LIVE = ["progress", "plans", "courses"]

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`

export function Courses() {
  const [tab, setTab] = useState("courses")
  const [view, setView] = useState("official")

  const selectTab = (id: string) => {
    /* Plans is the planner, and it knows how to come back here. */
    if (id === "plans") window.location.href = "/planner.html?from=courses"
    else setTab(id)
  }

  return (
    <AppShell section="staff" assistLabel={null}>
      <main className="@container min-w-0 flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto flex w-full max-w-[1518px] flex-col gap-4">
          <ProfileCard
            programs={[AUDIT_STUDENT.program]}
            progressLabel="Planned Progress"
            actions={["Request to Review Plan", "Mark Changes as Reviewed", "Actions"]}
          />
          <NetworkRow />
          <TermStrip />

          {tab === "progress" ? (
            <>
              <AuditControls
                tabs={AUDIT_TABS}
                active={tab}
                live={LIVE}
                onSelectTab={selectTab}
                views={AUDIT_VIEWS}
                view={view}
                onSelectView={setView}
                lastComputed={LAST_COMPUTED}
              />
              <AuditCard>
                <AuditTree audit={AUDIT} />
              </AuditCard>
              <AuditCard>
                <UnmatchedSection
                  count={unmatchedAgainst([AUDIT]).length}
                  blurb={UNMATCHED_BLURB}
                  courses={unmatchedAgainst([AUDIT])}
                />
              </AuditCard>
            </>
          ) : (
            <CoursesCard onSelectTab={selectTab} />
          )}
        </div>
      </main>
    </AppShell>
  )
}

/* ================================================================ the tab */

/* What a term header can say, and which of it is on. The planner's Plan
 * details, moved up a level: its tags become the summary pills, and its Last
 * activity line — subtext under the tags, in the same small capitals — becomes
 * the term's context. Every term answers to the same list, so switching one
 * off takes it off all of them. */

type Detail = "courses" | "attempted" | "earned" | "gpa" | "total" | "school" | "agreement" | "standing"

const DETAIL_GROUPS: { label: string; fields: { id: Detail; label: string }[] }[] = [
  {
    label: "Term summary",
    fields: [
      { id: "courses", label: "Courses" },
      { id: "attempted", label: "Credits attempted" },
      { id: "earned", label: "Credits earned" },
      { id: "gpa", label: "Term GPA" },
      { id: "total", label: "Running total" },
    ],
  },
  {
    label: "Term context",
    fields: [
      { id: "school", label: "School" },
      { id: "agreement", label: "Study agreement" },
      { id: "standing", label: "Academic standing" },
    ],
  },
]

/** Context the partner actually sends. A detail with nothing behind it is a
 *  dead switch, so the menu only offers what some term has. */
const SENT = new Set<Detail>(
  RECORD_TERMS.flatMap((term) => [
    ...(term.context.school ? (["school"] as const) : []),
    ...(term.context.agreement ? (["agreement"] as const) : []),
    ...(term.context.standing ? (["standing"] as const) : []),
  ])
)

/** The menu is a future option, not part of PROG-12920: off until it is
 *  picked up, and everything below shows as it would with it untouched. */
const DETAILS_MENU = false

/** Everything on: the summary is today's header, and the context is on
 *  wherever it was sent. */
const DETAILS_DEFAULT = new Set<Detail>(DETAIL_GROUPS.flatMap((group) => group.fields.map((f) => f.id)))

function CoursesCard({ onSelectTab }: { onSelectTab: (id: string) => void }) {
  /* Terms still ahead open folded: nothing in them has happened, and the
     record is read from the top. */
  const [open, setOpen] = useState<Set<string>>(
    () =>
      new Set([
        "transfer",
        ...RECORD_TERMS.filter((term) => term.phase !== "future").map((term) => term.id),
      ])
  )
  const [shown, setShown] = useState<Set<Detail>>(DETAILS_DEFAULT)

  const flip = <T,>(set: Set<T>, item: T) => {
    const next = new Set(set)
    if (next.has(item)) next.delete(item)
    else next.add(item)
    return next
  }

  return (
    <section className="flex flex-col gap-6 rounded-md border border-gray-40 bg-card py-6 shadow-xs">
      <RecordTabs tabs={AUDIT_TABS} active="courses" live={LIVE} onSelect={onSelectTab} />

      <div className="flex flex-col gap-10 px-6">
        <div className="flex justify-end gap-2">
          <Button>Simulate GPA</Button>
          {DETAILS_MENU && (
            <DetailsMenu shown={shown} onToggle={(id) => setShown((was) => flip(was, id))} />
          )}
          <Button size="icon" aria-label="Sort terms">
            <Icon name="filter-list" size={16} />
          </Button>
        </div>

        <TermSection
          name="Transfer Credits"
          open={open.has("transfer")}
          onToggle={() => setOpen((was) => flip(was, "transfer"))}
          badges={summary(shown, {
            courses: RECORD_TRANSFER.rows.length,
            attempted: RECORD_TRANSFER.attempted,
            earned: RECORD_TRANSFER.earned,
          })}
        >
          {RECORD_TRANSFER.rows.map((row) => (
            <CourseRow
              key={row.id}
              row={row}
              when={row.transferred}
              detail={`${row.source} | Grade: ${row.grade}`}
            />
          ))}
        </TermSection>

        {RECORD_TERMS.map((term) => (
          <TermSection
            key={term.id}
            name={term.name}
            open={open.has(term.id)}
            onToggle={() => setOpen((was) => flip(was, term.id))}
            badges={summary(shown, {
              courses: term.rows.length,
              attempted: term.attempted,
              earned: term.earned,
              gpa: term.gpa,
              /* Nothing ahead has been attempted yet; it is planned. */
              planned: term.phase === "future",
            })}
            context={<TermContextLine context={term.context} shown={shown} />}
            total={
              shown.has("total")
                ? `Total at the end of ${term.name}: ${plural(term.total.courses, "course")}, ${term.total.attempted} credits attempted, ${term.total.earned} credits earned *`
                : undefined
            }
          >
            {term.rows.map((row) => (
              <CourseRow key={row.id} row={row} />
            ))}
          </TermSection>
        ))}

        {/* The footnote belongs to the asterisk, so it goes where the totals go. */}
        {shown.has("total") && <p className="text-body-md text-gray-80">*&nbsp; {RECORD_FOOTNOTE}</p>}
      </div>
    </section>
  )
}

/** The Plan details menu, grouped: an eye beside each detail, open or shut,
 *  and the menu stays up to take the next one. */
function DetailsMenu({ shown, onToggle }: { shown: Set<Detail>; onToggle: (id: Detail) => void }) {
  const groups = DETAIL_GROUPS.map((group) => ({
    ...group,
    fields: group.fields.filter(
      (field) => !["school", "agreement", "standing"].includes(field.id) || SENT.has(field.id)
    ),
  })).filter((group) => group.fields.length > 0)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="data-[state=open]:bg-gray-5">
          <Icon name="remove-red-eye" size={16} />
          Course details
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[220px]">
        {groups.map((group, i) => (
          <div key={group.label}>
            {i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-overline font-medium tracking-[0.5px] text-gray-80 uppercase">
              {group.label}
            </DropdownMenuLabel>
            {group.fields.map((field) => {
              const on = shown.has(field.id)
              return (
                <DropdownMenuItem
                  key={field.id}
                  onSelect={(event) => {
                    event.preventDefault()
                    onToggle(field.id)
                  }}
                  className="gap-2 py-1.5 pr-2 pl-8 text-body-md"
                >
                  <Icon
                    name={on ? "remove-red-eye" : "visibility-off"}
                    size={16}
                    className={cn("absolute left-2 shrink-0", on ? "text-gray-100" : "text-gray-40")}
                  />
                  {field.label}
                </DropdownMenuItem>
              )
            })}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function summary(
  shown: Set<Detail>,
  term: { courses: number; attempted: number; earned: number; gpa?: string; planned?: boolean }
) {
  return [
    ...(shown.has("courses") ? [plural(term.courses, "Course")] : []),
    ...(shown.has("attempted")
      ? [`${term.attempted} Credits ${term.planned ? "Planned" : "Attempted"}`]
      : []),
    ...(shown.has("earned") ? [`${term.earned} Credits Earned`] : []),
    ...(shown.has("gpa") && term.gpa ? [`GPA ${term.gpa}`] : []),
  ]
}

/** The term's context, as one line of subtext in the Last activity style.
 *  Whatever was sent and is switched on, in a fixed order; nothing at all and
 *  there is no line, so a partner who sends none of it sees today's header. */
function TermContextLine({ context, shown }: { context: TermContext; shown: Set<Detail> }) {
  const parts: ReactNode[] = []

  if (shown.has("school") && context.school) {
    parts.push(<span key="school">{context.school}</span>)
  }
  if (shown.has("agreement") && context.agreement) {
    parts.push(<span key="agreement">{context.agreement}</span>)
  }
  if (shown.has("standing") && context.standing) {
    parts.push(<span key="standing">{context.standing.label}</span>)
  }

  if (parts.length === 0) return null

  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-overline font-medium tracking-[0.5px] text-gray-80 uppercase">
      {parts.flatMap((part, i) => (i === 0 ? [part] : [<span key={`dot-${i}`} aria-hidden="true">·</span>, part]))}
    </p>
  )
}

function TermSection({
  name,
  open,
  onToggle,
  badges,
  context,
  total,
  children,
}: {
  name: string
  open: boolean
  onToggle: () => void
  badges: string[]
  context?: ReactNode
  total?: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            className="flex cursor-pointer items-center gap-1 text-h300 font-semibold text-gray-100"
          >
            {name}
            <Icon name={open ? "expand-more" : "chevron-right"} size={20} />
          </button>
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {badges.map((badge) => (
                <Badge key={badge}>{badge}</Badge>
              ))}
            </div>
          )}
        </div>
        {/* Part of what the term holds, so it folds away with the courses. */}
        {open && context}
      </div>

      {open && (
        <>
          <div className="flex flex-col gap-2 pl-5">{children}</div>
          {total && <p className="text-body-md text-gray-80">{total}</p>}
        </>
      )}
    </section>
  )
}

/** How a course that has not finished stands. A finished one says so with its
 *  grade, which is all the row needs. */
const STATUS: Partial<Record<RecordRow["mark"], { label: string; variant: "secondary" | "warning" }>> = {
  "in-progress": { label: "Enrolled", variant: "secondary" },
  registered: { label: "Registered", variant: "secondary" },
  planned: { label: "Planned", variant: "warning" },
}

function CourseRow({ row, when, detail }: { row: RecordRow; when?: string; detail?: string }) {
  const status = STATUS[row.mark]

  return (
    <div className="flex flex-wrap items-start gap-x-6 gap-y-1 rounded-md border border-gray-40 px-4 py-3">
      <span className={cn("w-[180px] shrink-0 text-body-md", row.seat ? "text-gray-60" : "text-gray-100")}>
        {row.seat ? "—" : row.code}
      </span>
      <div className="flex min-w-[200px] flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-body-md text-gray-100">{row.name}</span>
          {status && <Badge variant={status.variant}>{status.label}</Badge>}
        </div>
        {detail && <p className="text-body-md text-gray-80">{detail}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-6 text-overline text-gray-80 uppercase">
        {when && <span>{when}</span>}
        <span>{plural(row.credits, "credit")}</span>
        <span className="w-6 text-right text-body-md text-gray-100 normal-case">{row.grade ?? ""}</span>
      </div>
    </div>
  )
}
