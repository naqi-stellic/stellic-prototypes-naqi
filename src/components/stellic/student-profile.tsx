import { cn } from "cn"
import { Fragment, useState, type ReactElement, type ReactNode } from "react"

import { Icon, type IconName } from "@/components/icon"
import { useIsStaff } from "@/components/layout/section"
import { Face, RecordTabs } from "@/components/stellic/staff-chrome"
import { Button } from "@/components/ui/button"
import {
  AUDIT_STUDENT,
  CUMULATIVE_GPA,
  CURRENT_TERM,
  type AuditBarShares,
  OFFICIAL_PROGRESS,
  type AuditStanding,
  type MilestoneStanding,
} from "@/data/audit"

/* The head of the progress screen: who the student is, how far through they
 * are, who is looking after them, and what they are taking right now. Four
 * cards on the page's grey, each one a flat white panel — nothing here is a
 * control surface, so nothing is lifted higher than a card. */

export function ProgressCard({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <section className={cn("rounded-md border border-gray-40 bg-card p-6 shadow-xs", className)}>
      {children}
    </section>
  )
}

/** One line of the identity block: a glyph and what it says. */
function Fact({ icon, children }: { icon?: IconName; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-body-md text-gray-80">
      {icon && <Icon name={icon} size={16} className="shrink-0" />}
      {children}
    </div>
  )
}

/** A bar of shares, and the dots that say what each share was. The widths are
 *  the counts rather than the frame's pixels, so the bar moves when the audit
 *  does — which is the point of computing one. */
export function ShareBar({
  shares,
  className,
  segment,
  dotted,
}: {
  shares: { count: number; colour: string; dot?: string }[]
  className?: string
  /** Wraps a share's length of the bar, for a page that says more on hover. */
  segment?: (node: ReactElement, index: number) => ReactNode
  /** Wraps a share's dot and count, likewise. */
  dotted?: (node: ReactElement, index: number) => ReactNode
}) {
  const total = shares.reduce((sum, share) => sum + share.count, 0)

  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      <div className="flex h-2 w-full overflow-hidden rounded-full">
        {shares.map((share, i) => {
          const bar = (
            <span
              /* A white hairline between shares, as the frame draws it: two
                 oranges meeting would otherwise read as one. */
              className={cn(share.colour, i < shares.length - 1 && "border-r border-white")}
              style={{ width: `${(share.count / total) * 100}%` }}
            />
          )
          return <Fragment key={i}>{segment ? segment(bar, i) : bar}</Fragment>
        })}
      </div>
      <div className="flex items-center gap-[17px]">
        {shares.map((share, i) => {
          if (!share.dot) return null
          const dot = (
            <span className="flex items-center gap-2 px-0.5">
              <span className={cn("size-2 shrink-0 rounded-full", share.dot)} />
              <span className="text-body-md text-gray-80">{share.count}</span>
            </span>
          )
          return <Fragment key={i}>{dotted ? dotted(dot, i) : dot}</Fragment>
        })}
      </div>
    </div>
  )
}

/** Scott's own face. A record of a person leads with the person, and initials
 *  are what you show when you have not got one — so they stay as the fallback
 *  rather than as the design. */
/** How much of Stellic this student is actually using. The unlit bolts stay on
 *  the row: three of five and five of five have to be telling apart at a
 *  glance, and three bolts alone do not. */
export function EngageBolts({ lit, of, size = 14 }: { lit: number; of: number; size?: number }) {
  return (
    <span className="flex gap-0.5">
      {Array.from({ length: of }, (_, i) => (
        <Icon
          key={i}
          name="bolt"
          size={size}
          className={i < lit ? "text-accent-amber" : "text-gray-40"}
        />
      ))}
    </span>
  )
}

export function StudentFace({ size = 40, className }: { size?: number; className?: string }) {
  const [failed, setFailed] = useState(false)

  if (failed || !AUDIT_STUDENT.photo) {
    return (
      <span
        style={{ width: size, height: size, fontSize: size * 0.32 }}
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-gray-40 leading-none text-white",
          className
        )}
      >
        {AUDIT_STUDENT.initials}
      </span>
    )
  }

  return (
    <img
      src={AUDIT_STUDENT.photo}
      alt={AUDIT_STUDENT.name}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      style={{ width: size, height: size }}
      className={cn("shrink-0 rounded-full object-cover", className)}
    />
  )
}

/** What only the student whose record this is may do. Asking to have your plan
 *  reviewed is a request made of somebody; a staff member reading the same
 *  record is that somebody, so the button is not theirs to press.
 *
 *  Filtered here rather than left to each page, because every prototype that
 *  puts a staff nav beside this card would otherwise have to remember. */
const STUDENT_ONLY = new Set(["Request to Review Plan"])

export function ProfileCard({
  programs,
  progressLabel = "Official Progress",
  actions = ["Request to Review Plan", "Actions"],
  progress = OFFICIAL_PROGRESS,
  tags = [],
}: {
  programs: string[]
  /** What else the registrar has tagged this student as, beside their level.
   *  Drawn the same way — a tag is a tag — and given per page, because the
   *  one that matters here is the reason this page is checking him at all. */
  tags?: string[]
  /** What the bars are a reading of. The record's own standing by default;
   *  a what-if hands over the standing of whatever is on the page, because a
   *  bar that still counts the degree you just replaced is measuring a tree
   *  nobody is looking at. */
  progress?: { courses: AuditStanding; milestones: MilestoneStanding }
  /** What the progress block is a reading of. The compliance screen reads the
   *  plan where Progress reads the registrar. */
  progressLabel?: string
  /** What can be done to this record from here. A staff screen has one more
   *  to offer than a student's does. */
  actions?: string[]
}) {
  const { courses, milestones } = progress
  const staff = useIsStaff()
  const shown = staff ? actions.filter((action) => !STUDENT_ONLY.has(action)) : actions

  return (
    <ProgressCard className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start gap-4">
        <StudentFace size={124} />

        <div className="flex min-w-[240px] flex-1 flex-col gap-2">
          <p className="text-h300 font-semibold text-gray-100">{AUDIT_STUDENT.name}</p>
          <div className="flex gap-2 text-body-md text-gray-80">
            <span>{AUDIT_STUDENT.username}</span>
            <a href="#" className="underline [text-underline-position:from-font]">
              {AUDIT_STUDENT.email}
            </a>
          </div>
          <p className="text-body-md text-gray-80">{AUDIT_STUDENT.standing}</p>

          {/* The degree, then anything the what-if has added beside it, then
              the pathway that laid the first one out — the same lines the plan
              header names, and each a way in to its own audit. */}
          {programs.map((program) => (
            <Fact key={program} icon="school">
              <a href="#" className="flex items-center">
                {program}
                <Icon name="chevron-right" size={16} className="shrink-0" />
              </a>
            </Fact>
          ))}
          <Fact icon="class">
            <a href="#" className="flex items-center">
              {AUDIT_STUDENT.pathway}
              <Icon name="chevron-right" size={16} className="shrink-0" />
            </a>
          </Fact>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Fact icon="place">{AUDIT_STUDENT.campus}</Fact>
            <Fact>
              <span className="font-bold">EY</span>
              <span>{AUDIT_STUDENT.entry}</span>
            </Fact>
            <Fact icon="sell">{AUDIT_STUDENT.level}</Fact>
            {tags.map((tag) => (
              <Fact key={tag} icon="sell">
                {tag}
              </Fact>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-start gap-2">
          {shown.map((action) => (
            <Button key={action}>{action}</Button>
          ))}
          <Button size="icon" aria-label="History">
            <Icon name="watch-later" size={16} />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <p className="text-body-md font-semibold text-gray-100">{progressLabel}</p>
          <Icon name="info" size={16} className="text-gray-80" />
        </div>
        <div className="flex flex-wrap items-start gap-6">
          <div className="flex min-w-[240px] flex-1 flex-col gap-2">
            <p className="text-body-md text-gray-100">Courses</p>
            <ShareBar
              /* The same three colours the audit's own bars use, and the
                 same three groupings: done, claimed but not earned, and
                 nothing placed against it. Registered sits in the middle band
                 because the official audit counts it and because the kit gives
                 it the same amber as a course under way. */
              shares={[
                { count: courses.taken, colour: "bg-success-50", dot: "bg-success-50" },
                {
                  count: courses.inProgress + courses.registered,
                  colour: "bg-warning-25",
                  dot: "bg-warning-25",
                },
                {
                  count: courses.remaining - courses.registered,
                  colour: "bg-gray-40",
                  dot: "bg-gray-40",
                },
              ]}
            />
          </div>
          <div className="flex w-[350px] flex-col gap-2 max-lg:w-full">
            <div className="flex items-center gap-2">
              <Icon name="outlined-flag" size={16} className="text-gray-100" />
              <p className="text-body-md text-gray-100">Milestones</p>
            </div>
            <ShareBar
              shares={[
                { count: milestones.done, colour: "bg-success-50", dot: "bg-success-50" },
                /* Same grey as the bar beside it. The two sit on one row, and
                   an emptier-looking milestone bar was a difference in tone
                   rather than in progress. */
                { count: milestones.total - milestones.done, colour: "bg-gray-40" },
              ]}
            />
          </div>
        </div>
      </div>
    </ProgressCard>
  )
}

/** The three cards under the profile: who to ask, how it is going, and what
 *  they care about. */
export function NetworkRow({
  cgpa = CUMULATIVE_GPA.value,
  term,
}: {
  /** The cumulative average this page's transcript comes to. Explain Progress
   *  reads a record of its own, and a card reporting the shared one would be
   *  contradicting the audit two cards below it. */
  cgpa?: string
  /** Which term the average beside it is for, and what it was. Given where the
   *  page can count one off its own record. */
  term?: { name: string; gpa: string }
}) {
  const { advisor, engage } = AUDIT_STUDENT
  const reading = term ?? { name: engage.term, gpa: engage.termGpa }

  return (
    <div className="flex flex-wrap items-stretch gap-4">
      {/* Two cards, half each. Neither is the more important one, and a fixed
          width on the second made the first take whatever was left. */}
      <ProgressCard className="flex min-w-[280px] flex-1 basis-0 flex-col gap-4">
        <p className="text-body-md font-semibold text-gray-80">Student Success Network</p>
        <div className="flex items-start gap-4">
          <Face
            photo={advisor.photo}
            initials={advisor.initials}
            color="var(--color-gray-5)"
            size={32}
            className="mt-px"
          />
          <div className="flex flex-col gap-2">
            <p className="text-body-md font-semibold text-gray-100">{advisor.name}</p>
            <div className="flex gap-2">
              <Button size="icon" aria-label={`Message ${advisor.name}`}>
                <Icon name="alternate-email" size={16} />
              </Button>
              <Button size="icon" aria-label={`Email ${advisor.name}`}>
                <Icon name="mail" size={16} />
              </Button>
              <Button size="icon" aria-label={`Book time with ${advisor.name}`}>
                <Icon name="calendar-today" size={16} />
              </Button>
            </div>
          </div>
        </div>
        <a
          href="#"
          className="text-body-md text-gray-80 underline [text-underline-position:from-font]"
        >
          show {advisor.others} other advisor
        </a>
      </ProgressCard>

      <ProgressCard className="flex min-w-[280px] flex-1 basis-0 items-start justify-between gap-4">
        <div className="flex flex-col gap-4">
          <p className="text-body-md font-semibold text-gray-80">Stellic Engage</p>
          <EngageBolts lit={engage.lit} of={engage.bolts} size={16} />
        </div>
        <div className="flex flex-col gap-4 text-body-md font-semibold text-gray-80">
          <p>{reading.name}</p>
          <p className="text-center text-caption-lg">{reading.gpa}</p>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-1">
            <p className="text-body-md font-semibold text-gray-80">CGPA</p>
            <Icon name="info" size={16} className="text-gray-80" />
          </div>
          {/* Down on the term, which is the one figure here that is a warning
              rather than a fact. */}
          <div className="flex items-center gap-1">
            <p className="text-caption-lg font-semibold text-gray-80">{cgpa}</p>
            <Icon name="arrow-drop-down" size={16} className="text-alert-50" />
          </div>
        </div>
      </ProgressCard>

    </div>
  )
}

/** The term under way, and the classes in it. */
export function TermStrip() {
  return (
    <ProgressCard className="flex flex-wrap items-center gap-x-6 gap-y-4">
      <div className="flex shrink-0 flex-col gap-2">
        <p className="text-caption-lg font-semibold text-gray-100">{CURRENT_TERM.name}</p>
        <p className="text-body-md text-gray-80">{CURRENT_TERM.credits} Credits</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {CURRENT_TERM.courses.map((code) => (
          <span
            key={code}
            className="flex h-8 items-center rounded-full bg-gray-0 px-3 text-body-md text-gray-80"
          >
            {code}
          </span>
        ))}
      </div>
    </ProgressCard>
  )
}

/* ============================================================ audit controls
   The strip above the tree: which tab of the student's record you are on,
   which audit you are reading, and how fresh it is. */

export function AuditControls({
  tabs,
  active,
  live,
  onSelectTab,
  views,
  view,
  onSelectView,
  scopes,
  scope,
  lastComputed,
}: {
  tabs: { id: string; label: string; count?: number }[]
  active: string
  /** The tabs that lead somewhere. The rest are drawn — they are part of the
   *  record and leaving them out would misrepresent it — but they do not
   *  pretend to open, because there is nothing behind them to open onto. */
  live: string[]
  /** Absent where only one tab leads anywhere, which is every prototype so
   *  far: there is nothing to switch to. */
  onSelectTab?: (id: string) => void
  views: { id: string; label: string; bar: AuditBarShares }[]
  view: string
  onSelectView: (id: string) => void
  /** Omitted where there is nothing to scope: the compliance ruleset is read
   *  whole or not at all. */
  scopes?: string[]
  scope?: string
  lastComputed: string
}) {
  return (
    <section className="flex flex-col gap-6 rounded-md border border-gray-40 bg-card py-6 shadow-xs">
      <RecordTabs tabs={tabs} active={active} live={live} onSelect={onSelectTab} />

      <div className="flex flex-wrap items-start justify-between gap-4 px-6">
        <div className="flex">
          {views.map((option, i) => {
            const on = option.id === view

            return (
              <div key={option.id} className="flex flex-col gap-4">
                <button
                  type="button"
                  onClick={() => onSelectView(option.id)}
                  aria-pressed={on}
                  className={cn(
                    "flex h-9 w-[130px] cursor-pointer items-center justify-center gap-1 border px-[15px] text-body-md",
                    i === 0 ? "rounded-l-md" : "-ml-px rounded-r-md",
                    on
                      ? "z-10 border-primary-50 bg-primary-0 text-primary-50"
                      : "border-gray-40 bg-card text-gray-80"
                  )}
                >
                  {option.label}
                  <Icon name="info-filled" size={16} />
                </button>
                {/* A seven-pixel read of what that audit says, under the button
                    that switches to it. */}
                <div className="w-[121px] px-2">
                  {/* The kit's three colours, and its own denominator. Both
                      bands had been drawn against a literal 105, which put an
                      audit nearly half done at a seventh full. */}
                  <div className="flex h-[7px] w-full overflow-hidden rounded-full">
                    <span
                      className="border-r border-white bg-success-50"
                      style={{ width: `${(option.bar.done / option.bar.total) * 100}%` }}
                    />
                    <span
                      className="border-r border-white bg-warning-25"
                      style={{ width: `${(option.bar.claimed / option.bar.total) * 100}%` }}
                    />
                    <span className="flex-1 bg-gray-40" />
                    <span className="sr-only">
                      {option.bar.done + option.bar.claimed} of {option.bar.total}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex flex-col items-end gap-1">
          {scopes && scope && (
            <div className="flex items-start gap-2">
              <Button size="icon" aria-label="Recompute audit">
                <Icon name="refresh" size={16} />
              </Button>
              <button
                type="button"
                className="flex h-9 w-[200px] cursor-pointer items-center gap-2 rounded-md border border-input bg-card px-[11px] text-body-md shadow-xs"
              >
                <span className="flex-1 truncate text-left">{scope}</span>
                <Icon name="expand-more" size={16} />
                <span className="sr-only">of {scopes.join(", ")}</span>
              </button>
            </div>
          )}
          <div className="flex items-center gap-1 text-body-md text-gray-80">
            <Icon name="timer" size={16} />
            {lastComputed}
          </div>
        </div>
      </div>
    </section>
  )
}
