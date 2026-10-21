import { AUDIT, CURRENT_TERM, DUAL_ENROLMENT, type AuditEntry, type AuditMark } from "@/data/audit"
import { TRANSFER_COLLEGE, type IncomingGroup } from "@/data/incoming"
import { STUDENT, SYNCED, emptyYear, type PlannedCourse, type Year } from "@/data/plan"

/* The plan as this student's record has it.
 *
 * Team Plan's prototypes open on a plan of their own, and that is fine: they
 * are about the plan. This one is about the record, and a staff member who
 * opens Plans from a student's audit has to find the same student on the other
 * side of the click — the same term under way, holding the same five courses
 * the audit says are in progress.
 *
 * So it is derived rather than written down. The audit already knows which
 * courses are under way, which are registered and which are only planned; this
 * reads those marks and lays them out in terms. The two cannot drift, because
 * there is only one of them. */

/** Where a course sits in the plan follows from how the audit marks it. */
const TERM_OF: Partial<Record<AuditMark, "now" | "next">> = {
  "in-progress": "now",
  registered: "next",
  planned: "next",
}

type Found = { code: string; name: string; mark: AuditMark; result?: string }

/** A finished course says when it was finished — "Taken in Spring '26" — and
 *  that is the only record of which term it belongs to. Read rather than
 *  written down a second time. */
function termOfResult(result?: string): { season: string; year: number } | null {
  const said = /Taken in (Fall|Spring|Summer) '(\d{2})/.exec(result ?? "")
  return said ? { season: said[1], year: 2000 + Number(said[2]) } : null
}

/** Every course the audit has put somewhere, in the order the tree holds them.
 *  Additional checks are stepped over — they re-list courses counted already,
 *  and a plan that showed a course twice would be wrong about the term. */
function scheduled(): Found[] {
  const found: Found[] = []
  const seen = new Set<string>()

  const walk = (entry: AuditEntry) => {
    if (entry.kind === "milestone") return
    if (entry.kind === "course") {
      if (!entry.code || seen.has(entry.code)) return
      if (!TERM_OF[entry.mark] && entry.mark !== "taken") return
      seen.add(entry.code)
      found.push({ code: entry.code, name: entry.name, mark: entry.mark, result: entry.result })
      return
    }
    if (entry.restated) return
    entry.children.forEach(walk)
  }
  walk(AUDIT)

  return found
}

/** Course colours, handed out in order. A term of six is the most the credit
 *  ceiling allows, which is why there are six of them. */
const ACCENTS = ["navy", "sky", "magenta", "blue", "lavender", "violet"] as const

const card = (found: Found, i: number, settled: boolean): PlannedCourse => ({
  id: `r${i}`,
  code: found.code,
  name: found.name,
  credits: 3,
  section: "Lec-01",
  accent: ACCENTS[i % ACCENTS.length],
  registered: settled,
  campus: "Main",
  modality: "In Person",
  gradeOption: "Graded",
  /* A class already through registration is the registrar's record of it; one
     still only planned is the student's own doing — and this is the one view
     where the reader is not the student, so it says whose. */
  lastActivity: settled ? SYNCED : BY_SCOTT,
})

/** Named rather than "you": a staff member reading a student's plan is not
 *  the student, and "added by you" would be telling them they did it. */
const BY_SCOTT = `Added by ${STUDENT.name.split(" ")[0]}, 2 Sep 2026`

/** The year the student is in, then the years ahead of them. The term under way
 *  takes its name from the record, so the plan and the term strip above it are
 *  naming the same term. */
export function recordPlan(): Year[] {
  const courses = scheduled()
  const now = courses.filter((course) => TERM_OF[course.mark] === "now")
  const next = courses.filter((course) => TERM_OF[course.mark] === "next")

  /* Fall 2026 → Spring 2027: the term under way and the one after it. */
  const start = Number(CURRENT_TERM.name.split(" ")[1])

  /* Everything already passed, back in the term that passed it. A plan that
     began at the year under way would be telling a staff member the student
     has done nothing, which the audit beside it flatly contradicts. */
  const done = courses
    .filter((course) => course.mark === "taken")
    .map((course) => ({ ...course, when: termOfResult(course.result) }))
    .filter((course) => course.when)

  const past: Year[] = []
  const years = [...new Set(done.map((course) => course.when!.year))].sort()
  /* A fall and the spring after it are one academic year. */
  const first = Math.min(...years)

  if (done.length) {
    const inTerm = (season: string, year: number) =>
      done.filter((course) => course.when!.season === season && course.when!.year === year)

    past.push({
      label: `${first}-${first + 1}`,
      phase: "complete",
      terms: [
        {
          id: `fall-${first}`,
          name: `Fall ${first}`,
          window: "Sep - Dec",
          campus: "Main campus",
          reviewed: true,
          locked: true,
          state: "completed",
          courses: inTerm("Fall", first).map((course, i) => card(course, i, true)),
        },
        {
          id: `spring-${first + 1}`,
          name: `Spring ${first + 1}`,
          window: "Jan - May",
          campus: "Main campus",
          reviewed: true,
          locked: true,
          state: "completed",
          courses: inTerm("Spring", first + 1).map((course, i) => card(course, 20 + i, true)),
        },
      ],
    })
  }

  return [
    ...past,
    {
      label: `${start}-${start + 1}`,
      phase: "active",
      terms: [
        {
          id: `fall-${start}`,
          name: CURRENT_TERM.name,
          window: "Sep - Dec",
          campus: "Main campus",
          reviewed: true,
          /* Under way, so every class has been chosen and nothing moves. */
          locked: true,
          scheduled: true,
          state: "registered",
          courses: now.map((course, i) => card(course, i, true)),
        },
        {
          id: `spring-${start + 1}`,
          name: `Spring ${start + 1}`,
          window: "Jan - May",
          campus: "Main campus",
          reviewed: false,
          state: "planned",
          alert: { kind: "registration", closes: `Mon Jan 18, ${start + 1} • 11:59pm EST` },
          courses: [
            ...next.map((course, i) => card(course, now.length + i, course.mark === "registered")),
            /* The seat the audit is still holding open: a requirement with no
               course chosen for it, which is what a placeholder is for. */
            {
              id: "r-seat",
              code: "",
              name: "Finance elective",
              credits: 3,
              placeholder: true,
              seat: { code: "", name: "Finance elective" },
            },
          ],
        },
      ],
    },
    emptyYear(start + 1),
    emptyYear(start + 2),
    emptyYear(start + 3),
  ]
}

/** What the student arrived with, as the record has it. The audit calls this
 *  the unmatched list — credit the degree asked for none of — and the planner
 *  calls it incoming. Same four courses either way, so they read it from the
 *  same place. */
export function recordIncoming(): IncomingGroup[] {
  return [
    {
      kind: "Transfer Credits",
      items: DUAL_ENROLMENT.courses.map((course) => ({
        id: `i-${course.code}`,
        code: course.code,
        name: course.name,
        detail: TRANSFER_COLLEGE,
        credits: course.credits,
      })),
    },
  ]
}
