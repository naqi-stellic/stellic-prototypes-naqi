import {
  AUDIT,
  DEVELOPMENTAL,
  DUAL_ENROLMENT,
  type AuditCourse,
  type AuditEntry,
} from "@/data/audit"
import { gpaOf } from "@/data/gpa"
import { TRANSFER_COLLEGE } from "@/data/incoming"

/* The Courses tab: the student's record laid out by term rather than by
 * requirement.
 *
 * It is the same record the Progress tab reads, and it is derived from it
 * rather than written down beside it — the audit already says when every
 * course was taken, which term it is under way in, and what is registered or
 * only planned. This reads those marks and sorts them into terms, so the two
 * tabs cannot disagree about a single course.
 *
 * What it adds is the transcript's view of them: every course, whether or not
 * the degree has a use for it. The developmental algebra the degree refuses is
 * here, because it is on the transcript; the dual-enrolment credit is here,
 * under its own heading, because it arrived rather than being taken. */

export type RecordRow = AuditCourse & {
  /** A seat the plan is holding for a requirement, with no course chosen. */
  seat?: boolean
}

export type RecordTerm = {
  id: string
  name: string
  /** Done, under way, or still ahead. A term ahead opens folded, as it does in
   *  the product: nothing in it has happened yet. */
  phase: "past" | "current" | "future"
  rows: RecordRow[]
  attempted: number
  earned: number
  /** The term's own average, where anything in it has been graded. */
  gpa?: string
  /** What the transcript stands at once the term is over. */
  total: { courses: number; attempted: number; earned: number }
  /** What was true of the student during the term, as the SIS sent it. */
  context: TermContext
}

/** One school, one study agreement and one academic standing per term, each
 *  optional and left out when absent (PROG-12920). The school is shown by its
 *  display name, not the feed identifier; the agreement is free text shown as
 *  sent; standing is a code, shown by its display value (PROG-19154/19155). */
export type TermContext = {
  school?: string
  agreement?: string
  standing?: { code: string; label: string }
}

export type TransferBlock = {
  rows: (RecordRow & { transferred: string; source: string })[]
  attempted: number
  earned: number
}

/* ------------------------------------------------------- the student_term feed */

/** The academic standing reference list, which arrives in its own feed. The
 *  labels are the feed spec's examples; the codes stand in for NYU's. */
const STANDING = {
  GOOD: { code: "GOOD", label: "Good Standing" },
  PROB: { code: "PROB", label: "Academic Probation" },
} as const

const ARTS_AND_SCIENCE = "College of Arts & Science - Undergrad"
const BUSINESS = "School of Business & Economics - Undergrad"

/** The student_term rows the partner sends, one per term — sample data for
 *  the prototype. An internal transfer between schools (PROG-12909), a study
 *  agreement on some terms and not others, so the header is seen with
 *  different subsets of the three. */
const STUDENT_TERM: Record<string, TermContext> = {
  "fall-2025": { school: ARTS_AND_SCIENCE, standing: STANDING.GOOD },
  "spring-2026": { school: ARTS_AND_SCIENCE, standing: STANDING.GOOD },
  "fall-2026": { school: BUSINESS, agreement: "Dual Degree Agreement", standing: STANDING.GOOD },
  "spring-2027": { school: BUSINESS, agreement: "Dual Degree Agreement", standing: STANDING.GOOD },
}

const SEASON_ORDER = ["Spring", "Summer", "Fall"]

/** "Taken in Fall '25", "In progress · Fall '26", "Registered · Spring '27" —
 *  every course says which term it belongs to, and that is the only record of
 *  it. Read rather than written down a second time. */
function termOf(result?: string): { season: string; year: number } | null {
  const said = /(Fall|Spring|Summer) '(\d{2})/.exec(result ?? "")
  return said ? { season: said[1], year: 2000 + Number(said[2]) } : null
}

/** A grade that earns no credit. The four-point scale's only one; nothing on
 *  this record has it, but the rule is the footnote's, so it is written. */
const FAILING = new Set(["F", "NP"])

const earns = (row: RecordRow) =>
  row.mark === "taken" && !(row.grade && FAILING.has(row.grade))

/** Every course the audit places, once each. Additional checks re-list what is
 *  counted elsewhere, so they are stepped over; seats are kept by their own
 *  identity, since two of them read exactly alike. */
function placed(): RecordRow[] {
  const found: RecordRow[] = []
  const seen = new Set<string>()

  const walk = (entry: AuditEntry) => {
    if (entry.kind === "milestone") return
    if (entry.kind === "group") {
      if (!entry.restated) entry.children.forEach(walk)
      return
    }
    if (entry.mark === "remaining") return
    if (!entry.code) return void found.push({ ...entry, seat: true })
    if (seen.has(entry.code)) return
    seen.add(entry.code)
    found.push(entry)
  }
  walk(AUDIT)

  /* On the transcript and counting toward nothing — which is the Progress
     tab's business, not this one's. */
  return [...found, ...DEVELOPMENTAL.courses]
}

function byCode(a: RecordRow, b: RecordRow) {
  /* A seat has no code to sort by, and belongs after the courses that do. */
  if (a.seat !== b.seat) return a.seat ? 1 : -1
  return a.code.localeCompare(b.code)
}

function termsOf(rows: RecordRow[]): RecordTerm[] {
  const grouped = new Map<string, { season: string; year: number; rows: RecordRow[] }>()

  for (const row of rows) {
    const when = termOf(row.result)
    if (!when) continue
    const id = `${when.season.toLowerCase()}-${when.year}`
    if (!grouped.has(id)) grouped.set(id, { ...when, rows: [] })
    grouped.get(id)!.rows.push(row)
  }

  const ordered = [...grouped.entries()].sort(
    ([, a], [, b]) =>
      a.year - b.year || SEASON_ORDER.indexOf(a.season) - SEASON_ORDER.indexOf(b.season)
  )

  let courses = 0
  let attempted = 0
  let earned = 0

  return ordered.map(([id, term]) => {
    const rows = [...term.rows].sort(byCode)
    const termAttempted = rows.reduce((sum, row) => sum + row.credits, 0)
    const termEarned = rows.filter(earns).reduce((sum, row) => sum + row.credits, 0)
    const gpa = gpaOf(rows)

    courses += rows.length
    attempted += termAttempted
    earned += termEarned

    const phase = rows.every((row) => row.mark === "taken")
      ? "past"
      : rows.some((row) => row.mark === "in-progress")
        ? "current"
        : "future"

    return {
      id,
      name: `${term.season} ${term.year}`,
      context: STUDENT_TERM[id] ?? {},
      phase,
      rows,
      attempted: termAttempted,
      earned: termEarned,
      gpa: gpa.rows.length ? gpa.value : undefined,
      total: { courses, attempted, earned },
    }
  })
}

export const RECORD_TERMS: RecordTerm[] = termsOf(placed())

/** Credit that arrived rather than being taken. It sits above the terms and
 *  outside their totals, as the product keeps it: the running total is what
 *  was attempted here. */
export const RECORD_TRANSFER: TransferBlock = (() => {
  const rows = [...DUAL_ENROLMENT.courses].sort(byCode).map((row) => ({
    ...row,
    transferred: `Transferred in ${termOf(row.result)?.season} '${String(termOf(row.result)?.year).slice(2)}`,
    source: TRANSFER_COLLEGE,
  }))

  return {
    rows,
    attempted: rows.reduce((sum, row) => sum + row.credits, 0),
    earned: rows.filter(earns).reduce((sum, row) => sum + row.credits, 0),
  }
})()

export const RECORD_FOOTNOTE =
  "Total is a sum of non-repeated credits that did not receive a failing grade. See Progress tab for how courses align to degree requirements."
