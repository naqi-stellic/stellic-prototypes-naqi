import {
  ELECTIVE_COURSES,
  REMAINING_REQUIREMENTS,
  REPLACEMENT_SEAT,
  offeredIn,
  preferredFirst,
  type CatalogEntry,
} from "@/data/catalog"
import { heldAlready, prerequisiteCodes } from "@/data/course-detail"
import { seasonOf } from "@/data/issues"
import {
  CREDITS_PER_COURSE,
  PLANNING_RULES,
  asPlannedIn,
  emptyYear,
  findCourse,
  findTerm,
  scheduleTerm,
  type PlannedCourse,
  type Term,
  type Year,
} from "@/data/plan"

/* A generated draft: the student's plan with the generator's proposal laid over
 * it. Nothing is destroyed — a course the draft wants to move or drop stays on
 * the canvas, struck through, until the draft is accepted or dismissed. */

export type DraftOption = {
  id: string
  label: string
  blurb: string
  /** The blurb as a short list, where the option is read as one: the
   *  generator's account of a plan option is easier to scan point by point. */
  points?: string[]
  /** How full the option packs a term. Every course is CREDITS_PER_COURSE. */
  coursesPerTerm: number
  /** Adds a summer term to each academic year and plans through it. */
  summers: boolean
  /** A course the option cannot leave where the student put it. */
  move?: { courseId: string; toTermId: string; reason: string }
  /** A course the option drops; its requirement comes back as a held seat. */
  drop?: { courseId: string; reason: string }
  /** A term the student asked to keep light, and how light. The rest of the
   *  plan holds to the pace; this one term answers what they said about it,
   *  which is the whole use of having asked. */
  ease?: {
    termId: string
    coursesPerTerm: number
    /** How many of that term's places are left as seats to choose later, and
     *  which kind — an eased term is a poor place to spend the student's one
     *  remaining concentration elective. */
    seats: number
    seatKind?: string
  }
}

/** The most a term can hold, from the institution's credit ceiling. */
const MAX_COURSES_PER_TERM = Math.floor(PLANNING_RULES.maxCreditsPerTerm / CREDITS_PER_COURSE)
const MIN_COURSES_PER_TERM = 2
/** A guard on extending the plan, not a rule: eight years past the start is
 *  already far beyond any pace worth proposing. */
const MAX_YEARS = 12

/** Three ways to place the same requirements, built around the pace the student
 *  asked for: exactly that, one course heavier with summers, one course lighter.
 *  Answer a different pace and all three move with it. */
export function planOptions(coursesPerTerm: number): DraftOption[] {
  const steady = clamp(coursesPerTerm)
  const sooner = clamp(steady + 1)
  const lighter = clamp(steady - 1)

  return [
    {
      id: "steady",
      label: "Steady pace",
      blurb:
        `${steady} courses a term, the pace you asked for, no summers — except this spring, ` +
        `which is held to ${steady - 1} while you are working. Graduation does not move: ` +
        "Investments still runs before Financial Modeling, and the capstone still lands in your " +
        "final term.",
      points: [
        `${steady} courses a term, the pace you asked for, with no summers`,
        `This spring is held to ${steady - 1} while you are working`,
        "Graduation does not move: Investments still runs before Financial Modeling",
        "The capstone still lands in your final term",
      ],
      coursesPerTerm: steady,
      summers: false,
      /* The concentration elective is the one thing in that term with
         somewhere else to be: nothing is waiting on it, and a year later it is
         still a year before it is needed. */
      move: {
        courseId: "c6",
        toTermId: "fall-2027",
        reason: "nothing is waiting on it and your spring is lighter without it",
      },
      ease: {
        termId: "spring-2027",
        coursesPerTerm: steady - 1,
        seats: 1,
        seatKind: "GEN ELEC",
      },
    },
    {
      id: "sooner",
      label: "Finish sooner",
      blurb:
        `${sooner} courses a term and a summer term each year. Heavier than you asked for, but it ` +
        "clears the degree sooner.",
      points: [
        `${sooner} courses a term, plus a summer term each year`,
        "Heavier than you asked for",
        "Clears the degree sooner",
      ],
      coursesPerTerm: sooner,
      summers: true,
      move: { courseId: "c6", toTermId: "summer-2027", reason: "the term is full at six" },
    },
    {
      id: "lighter",
      label: "Lighter terms",
      blurb:
        `${lighter} courses a term, which leaves room for work or a co-op but adds a year. ` +
        "Financial Modeling is not offered late enough to keep, so its requirement is held as an " +
        "elective seat.",
      points: [
        `${lighter} courses a term, leaving room for work or a co-op`,
        "Adds a year",
        "Financial Modeling is not offered late enough to keep, so its requirement is held as an elective placeholder",
      ],
      coursesPerTerm: lighter,
      summers: false,
      drop: { courseId: "c6", reason: "Not offered again before you graduate" },
    },
  ]
}

function clamp(courses: number): number {
  return Math.max(MIN_COURSES_PER_TERM, Math.min(MAX_COURSES_PER_TERM, courses))
}

export type Draft = {
  optionId: string
  years: Year[]
  /** Courses the draft put on the canvas, placeholders included. */
  added: number
  /** Courses it took out of where they were — dropped, or moved elsewhere. */
  removed: number
  /** The last term the draft leaves you working in. */
  graduation: string
}

/** Reads a draft's tallies off the marks themselves, so a change made by hand
 *  counts exactly like one the generator made. `upTo` limits the count to the
 *  cards that have arrived, which is how the tallies climb as a draft lands. */
export function draftTally(years: Year[], upTo = Infinity): { added: number; removed: number } {
  let added = 0
  let removed = 0

  for (const year of years) {
    for (const term of year.terms) {
      for (const course of term.courses) {
        const mark = course.draft
        if (!mark || mark.order >= upTo) continue
        if (mark.mark === "added") {
          added += 1
          /* It is here because it left somewhere else. */
          if (mark.relocated) removed += 1
        } else {
          removed += 1
        }
      }
    }
  }

  return { added, removed }
}

/** The highest order a draft's marks carry, which is how long it takes to land. */
export function draftLength(years: Year[]): number {
  let last = 0
  for (const year of years) {
    for (const term of year.terms) {
      for (const course of term.courses) {
        if (course.draft) last = Math.max(last, course.draft.order)
      }
    }
  }
  return last
}

export function summariseDraft(years: Year[], optionId: string): Draft {
  return { optionId, years, ...draftTally(years), graduation: lastWorkingTerm(years) }
}

/** A catalogue entry on its way into a term. A released course carries the
 *  term it must not go back to, and the card it left behind. */
type QueueEntry = CatalogEntry & {
  avoid?: string
  ghostFor?: string
  /** Which outstanding requirement this entry is, by its place in the list.
   *  Carried onto the course the run places, so the panel of what is left can
   *  tell that this one now has a term. */
  requirement?: number
}

let seq = 0
/* The colours a course is drawn in down the side of a list and across a
 * calendar. Handed out in turn as courses are created, so a generated term
 * reads like any other rather than a run of gray bars. */
const ACCENTS = ["green", "amber", "purple", "brown", "teal", "rose"] as const

function nextAccent(): PlannedCourse["accent"] {
  return ACCENTS[seq % ACCENTS.length]
}

/** Re-colours what a run just put in a term so no two courses in it share a
 *  colour while a spare one is going unused. Handing them out in sequence is
 *  enough on its own until a course arrives carrying a colour of its own —
 *  then two of the same end up side by side. */
function spreadAccents(term: Term): Term {
  const taken = new Set(
    term.courses.filter((c) => c.draft?.mark !== "added").map((c) => c.accent)
  )
  return {
    ...term,
    courses: term.courses.map((course) => {
      if (course.draft?.mark !== "added") return course
      const free = ACCENTS.find((a) => !taken.has(a)) ?? course.accent
      taken.add(free)
      return { ...course, accent: free }
    }),
  }
}

/** When the generator ran. Fixed rather than "now" so the plan reads the same
 *  every time it is shown, like every other date in the data. */
const GENERATED_ON = "15 Sep 2026"

function draftCourse(entry: QueueEntry, order: number, note?: string): PlannedCourse {
  return {
    id: `d${(seq += 1)}`,
    code: entry.code,
    name: entry.name,
    credits: CREDITS_PER_COURSE,
    placeholder: entry.placeholder,
    ...(entry.requirement == null ? {} : { requirement: entry.requirement }),
    /* What the course is, which is known from the catalogue. Which sitting of
     * it to attend is not, so there is no section and no room or instructor —
     * those come with one. A seat has none of it: there is no course yet. */
    accent: nextAccent(),
    ...(entry.placeholder
      ? {}
      : {
          classNo: String(2500 + seq * 13),
          campus: "Main",
          modality: "In Person",
          gradeOption: "Graded",
        }),
    /* The student pressed Generate and then kept what came back, so it is
       theirs: a pathway proposed it, but nothing is in the plan until they
       accept it. What the pathway did on its own, months ago, is the plan
       they started from — those cards still say so. */
    lastActivity: `Added by you, ${GENERATED_ON}`,
    draft: { mark: "added", note: note ?? entry.reason, order },
  }
}

function summerTerm(year: number): Term {
  return {
    id: `summer-${year}`,
    name: `Summer ${year}`,
    window: "Jun - Aug",
    campus: "Main campus",
    reviewed: false,
    state: "planned",
    courses: [],
  }
}

/** Courses that still count towards a term's load — what the draft struck out
 *  does not. */
export function keptCourses(term: Term): PlannedCourse[] {
  return term.courses.filter((c) => c.draft?.mark !== "moved" && c.draft?.mark !== "removed")
}

export function generateDraft(
  base: Year[],
  option: DraftOption,
  /** Courses the student did not keep, which the generator may pick up and
   *  place wherever they fit best. */
  released: string[] = []
): Draft {
  seq = 0
  let order = 0

  /* Work on a copy: the student's own plan stays untouched underneath, so
   * dismissing the draft is just throwing this away. */
  let years: Year[] = base.map((year) => ({
    ...year,
    terms: year.terms.map((term) => ({ ...term, courses: [...term.courses] })),
  }))

  if (option.summers) {
    years = years.map((year) => {
      const end = Number(year.label.split("-")[1])
      return year.terms.some((t) => t.id.startsWith("summer-"))
        ? year
        : { ...year, terms: [...year.terms, summerTerm(end)] }
    })
  }

  const edit = (termId: string, fn: (term: Term) => Term) => {
    years = years.map((year) => ({
      ...year,
      terms: year.terms.map((term) => (term.id === termId ? fn(term) : term)),
    }))
  }

  /* What is left to place, rather than everything the degree ever wanted: a
     requirement already sitting in a term is answered, and putting a second
     copy of it somewhere else is not a plan. */
  const queue: QueueEntry[] = unplacedRequirements(base).map(({ entry, index }) => ({
    ...entry,
    requirement: index,
  }))

  /* A released course leaves its term the way the generator's own moves do —
   * struck through where it was — and goes to the front of the queue to be
   * placed again. `avoid` keeps it from landing back where it started: putting
   * it down where it already was is not a move worth showing. */
  const ghosts: { termId: string; courseId: string; order: number }[] = []
  for (const courseId of released) {
    const found = findCourse(years, courseId)
    if (!found || found.term.locked) continue
    const at = order++
    ghosts.push({ termId: found.term.id, courseId, order: at })
    edit(found.term.id, (term) => ({
      ...term,
      courses: term.courses.map((c) =>
        c.id === courseId
          ? { ...c, draft: { mark: "moved" as const, note: "You left this one open", order: at } }
          : c
      ),
    }))
    queue.unshift({
      code: found.course.code,
      name: found.course.name,
      reason: "You left this one open",
      placeholder: found.course.placeholder,
      avoid: found.term.id,
      ghostFor: courseId,
    })
  }

  /* A dropped course leaves its requirement unmet, so the draft holds a seat
   * for it further down the plan rather than quietly losing it. */
  if (option.drop && !released.includes(option.drop.courseId)) {
    const found = findCourse(years, option.drop.courseId)
    if (found && !found.term.locked) {
      const at = order++
      edit(found.term.id, (term) => ({
        ...term,
        courses: term.courses.map((c) =>
          c.id === option.drop!.courseId
            ? { ...c, draft: { mark: "removed", note: option.drop!.reason, order: at } }
            : c
        ),
      }))
      queue.push(REPLACEMENT_SEAT)
    }
  }

  /* A move leaves a struck-through marker behind, so the student can see where
   * the course went rather than hunting for it. */
  let moving: { course: PlannedCourse; from: string; to: string; reason: string } | null = null
  if (option.move && !released.includes(option.move.courseId)) {
    const found = findCourse(years, option.move.courseId)
    if (found && !found.term.locked) {
      const at = order++
      moving = {
        course: found.course,
        from: found.term.name,
        to: option.move.toTermId,
        reason: option.move.reason,
      }
      edit(found.term.id, (term) => ({
        ...term,
        courses: term.courses.map((c) =>
          c.id === option.move!.courseId
            ? { ...c, draft: { mark: "moved", note: `Moved to ${termName(years, option.move!.toTermId)}`, order: at } }
            : c
        ),
      }))
    }
  }

  /* Where each released course ended up, for the note left behind. */
  const placed = new Map<string, string>()

  /* Fills one term to the option's load from the front of the queue. Terms are
   * reached in order, so the queue's own priority — core, then concentration,
   * then general — becomes the order of the plan. */
  /* How many elective seats the generator holds rather than fills, term by
   * term from the nearest one out. An elective is the choice worth leaving to
   * the student, and it is worth leaving while there is still time to make it
   * — so the near terms keep room and the far ones get a named course, which
   * is the more useful answer that far ahead. */
  const SEATS_BY_TERM = [2, 1, 1]
  let reached = 0
  /* The terms already filled in this run, in order: what a course placed next
     can count as behind it. Terms are filled front to back, so this is exactly
     everything before the term being filled. */
  const sofar: Term[] = []
  const behind = (): Year[] => [{ label: "", phase: "future", terms: sofar }]
  /* Allowed here: not the term it was released from, offered in this season,
     and with everything it asks for already behind it. A run that drops a
     course into a term that does not run it, or ahead of what it needs, hands
     the student work to fix; the next requirement down goes instead. */
  const allowed = (entry: QueueEntry, term: Term) =>
    entry.avoid !== term.id && fits(entry, term, behind())

  const fillTerm = (term: Term): Term => {
    const filled = fillOne(term)
    sofar.push(filled)
    return filled
  }

  const fillOne = (term: Term): Term => {
    if (term.locked) return term
    /* The term the student asked about answers to what they said rather than
       to the pace. */
    const eased = option.ease?.termId === term.id ? option.ease : null
    const hold = eased ? eased.seats : (SEATS_BY_TERM[reached] ?? 0)
    reached += 1

    const incoming: PlannedCourse[] = []
    if (moving && moving.to === term.id) {
      incoming.push({
        ...moving.course,
        id: `${moving.course.id}-to`,
        draft: {
          mark: "added",
          note: `Moved from ${moving.from} — ${moving.reason}`,
          order: order++,
        },
      })
    }

    let room = (eased?.coursesPerTerm ?? option.coursesPerTerm) - keptCourses(term).length -
      incoming.length

    if (hold > 0) {
      for (let held = 0; held < hold && room > 0; held += 1) {
        const free = (entry: QueueEntry) => entry.placeholder && entry.avoid !== term.id
        /* The kind the term asked for, where it asked for one and the queue
           still holds it; otherwise whichever seat is next. */
        const wanted = eased?.seatKind
          ? queue.findIndex((entry) => free(entry) && entry.code === eased.seatKind)
          : -1
        const seat = wanted === -1 ? queue.findIndex(free) : wanted
        if (seat === -1) break
        const [entry] = queue.splice(seat, 1)
        incoming.push(draftCourse(entry, order++))
        room -= 1
      }
    }

    while (room > 0) {
      /* The first entry that is allowed to be here. */
      const next = queue.findIndex((entry) => allowed(entry, term))
      if (next === -1) break
      const [entry] = queue.splice(next, 1)
      if (entry.ghostFor) placed.set(entry.ghostFor, term.name)
      incoming.push(draftCourse(entry, order++))
      room -= 1
    }

    return incoming.length > 0
      ? spreadAccents({ ...term, courses: [...term.courses, ...incoming] })
      : term
  }

  years = years.map((year) => ({ ...year, terms: year.terms.map(fillTerm) }))

  /* A light pace needs more years than the plan has. Rather than leaving
   * requirements unplaced, the draft extends the plan — which is the same thing
   * the student would do by hand with "Add Year". */
  while (queue.length > 0 && years.length < MAX_YEARS) {
    const start = Number(years.at(-1)!.label.split("-")[0]) + 1
    const next = emptyYear(start)
    const terms = option.summers ? [...next.terms, summerTerm(start + 1)] : next.terms
    years = [...years, { ...next, terms: terms.map(fillTerm) }]
  }

  /* Whatever no term would take — nowhere left in the years the plan can
   * reach that runs it after what it needs — still goes in rather than off
   * the plan: into the last terms with room, where the term will say what is
   * wrong with it. A requirement that quietly vanished would be worse. */
  if (queue.length > 0) {
    years = years.map((year) => ({
      ...year,
      terms: year.terms.map((term) => {
        if (term.locked || queue.length === 0) return term
        const room = option.coursesPerTerm - keptCourses(term).length
        if (room <= 0) return term
        const extra = queue.splice(0, room).map((entry) => draftCourse(entry, order++))
        return spreadAccents({ ...term, courses: [...term.courses, ...extra] })
      }),
    }))
  }

  /* Now that the placement is known, the card left behind can say where its
   * course went. One that found no room anywhere is not struck out at all —
   * nothing happened to it. */
  for (const ghost of ghosts) {
    const to = placed.get(ghost.courseId)
    edit(ghost.termId, (term) => ({
      ...term,
      courses: term.courses.map((c) =>
        c.id !== ghost.courseId
          ? c
          : to
            ? { ...c, draft: { mark: "moved" as const, note: `Moved to ${to}`, order: ghost.order } }
            : { ...c, draft: undefined }
      ),
    }))
  }

  return summariseDraft(years, option.id)
}

function termName(years: Year[], termId: string): string {
  for (const year of years) {
    for (const term of year.terms) if (term.id === termId) return term.name
  }
  /* A summer the option is about to add is not on the canvas yet. */
  const [season, year] = termId.split("-")
  return `${season[0].toUpperCase()}${season.slice(1)} ${year}`
}

function lastWorkingTerm(years: Year[]): string {
  let last = "—"
  for (const year of years) {
    for (const term of year.terms) {
      if (keptCourses(term).length > 0) last = term.name
    }
  }
  return last
}

/** Takes the draft: struck-out courses go, marks come off everything else. */
export function acceptDraft(years: Year[]): Year[] {
  return years.map((year) => ({
    ...year,
    terms: year.terms.map((term) => ({
      ...term,
      courses: keptCourses(term).map(({ draft: _draft, ...course }) => course),
    })),
  }))
}

/** Fills one term to a credit target, leaving the rest of the plan alone. The
 *  same draft the plan generator makes — added cards, a tally, an Apply — only
 *  the scope is a term rather than the whole degree. Courses the student
 *  released are struck out and their requirements go back on the queue, so the
 *  term can be rebuilt around what was kept. */
export function generateTermDraft(
  base: Year[],
  termId: string,
  targetCredits: number,
  released: string[] = [],
  optionId: string = TERM_OPTIONS[0].id,
  /** The term's schedule is published, so the run picks class times too and
   *  what comes out is a timetable rather than a list. */
  withSchedule = false,
  /** What the student said about each held seat, by the seat's id. A seat is
   *  a requirement with several hundred courses behind it; this is the one
   *  thing that says which of them they actually want. */
  prefer: Record<string, string> = {}
): Draft {
  seq = 0
  let order = 0

  let years: Year[] = base.map((year) => ({
    ...year,
    terms: year.terms.map((term) => ({ ...term, courses: [...term.courses] })),
  }))

  /* The term the run is filling, so nothing is offered that would arrive with
     a warning on it. */
  const queue: QueueEntry[] = termQueue(optionId, base, findTerm(base, termId) ?? undefined)

  /* A held seat is the whole point of generating: it is a requirement with no
   * course against it, and the run is what chooses one. The seat becomes that
   * course where it stands — nothing is taken out and nothing arrives, so it
   * is not struck through and nothing is counted as removed. What happened is
   * that a blank was filled in. */
  for (const term of years.flatMap((y) => y.terms)) {
    if (term.id !== termId || term.locked) continue
    for (const course of term.courses) {
      if (!course.placeholder || released.includes(course.id)) continue
      /* A seat is filled from its own shelf: a finance elective takes a
         finance course, a general one takes a general course. Falling back to
         whatever is next would answer the requirement with the wrong kind of
         course, which is the one thing a seat is specific about. */
      /* Read in the order the student asked for: "Philosophy" moves the
         philosophy course to the front of its own shelf, and the queue is
         searched in that order rather than in the option's. */
      const shelf = preferredFirst(ELECTIVE_COURSES[course.code] ?? [], prefer[course.id])
      const wanted = shelf.reduce((found, e) => {
        if (found !== -1) return found
        return queue.findIndex((entry) => entry.code === e.code && entry.name === e.name)
      }, -1)
      /* Nothing on its own shelf is ready to be taken this term — every
         finance elective wants a course the student has not had yet, say. The
         seat stays a seat: a requirement with no course against it is a thing
         to decide later, and answering it with the wrong kind of course to
         avoid an empty row is worse than the empty row. */
      if (wanted === -1) continue
      const [pick] = queue.splice(wanted, 1)
      if (!pick) break
      const at = order++
      const seat = course.name
      years = mapTerm(years, termId, (t) => ({
        ...t,
        courses: t.courses.map((c) =>
          c.id !== course.id
            ? c
            : {
                ...c,
                code: pick.code,
                name: pick.name,
                placeholder: undefined,
                /* What it is answering, which outlives the draft note. */
                seat: c.seat ?? { code: c.code, name: c.name },
                classNo: String(2500 + (seq += 1) * 13),
                campus: "Main",
                modality: "In Person",
                gradeOption: "Graded",
                /* The seat was the pathway's; the course in it is this run's,
                   and the run is the student's. */
                lastActivity: `Added by you, ${GENERATED_ON}`,
                draft: { mark: "added" as const, note: `Fills your ${seat}`, order: at },
              }
        ),
      }))
    }
  }

  /* Anything let go leaves a struck card behind and its requirement returns to
   * the front of the queue, where the term may well pick it up again. */
  for (const courseId of released) {
    const found = findCourse(years, courseId)
    if (!found || found.term.id !== termId) continue
    const at = order++
    years = mapTerm(years, termId, (term) => ({
      ...term,
      courses: term.courses.map((c) =>
        c.id === courseId
          ? { ...c, draft: { mark: "removed" as const, note: "You left this one open", order: at } }
          : c
      ),
    }))
    if (!found.course.placeholder) {
      queue.unshift({
        code: found.course.code,
        name: found.course.name,
        reason: "You left this one open",
      })
    }
  }

  years = mapTerm(years, termId, (term) => {
    if (term.locked) return term
    const kept = keptCourses(term).reduce((n, c) => n + c.credits, 0)
    const room = Math.floor((targetCredits - kept) / CREDITS_PER_COURSE)

    const incoming: PlannedCourse[] = []
    for (let i = 0; i < room && queue.length > 0; i += 1) {
      incoming.push(draftCourse(queue.shift()!, order++))
    }
    const filled = spreadAccents(
      incoming.length > 0 ? { ...term, courses: [...term.courses, ...incoming] } : term
    )
    /* Each option starts from a different slot, so the three come back as
       three different weeks rather than the same one three times. */
    return withSchedule
      ? scheduleTerm(filled, TERM_OPTIONS.findIndex((o) => o.id === optionId))
      : filled
  })

  return summariseDraft(years, optionId)
}

/* Three ways to fill the same term to the same target. The load does not
 * change — that is the target the student set — so what differs is which of
 * the outstanding requirements gets taken first. */
export const TERM_OPTIONS: DraftOption[] = [
  {
    id: "term-core",
    label: "Core first",
    blurb:
      "Takes the business core before anything else, which is the order the requirements " +
      "are meant to be met in and keeps later terms free of prerequisites.",
    coursesPerTerm: 0,
    summers: false,
  },
  {
    id: "term-mixed",
    label: "A bit of each",
    blurb:
      "Alternates core, concentration and general education, so no single term is all of " +
      "one thing and the workload stays even.",
    coursesPerTerm: 0,
    summers: false,
  },
  {
    id: "term-general",
    label: "General education first",
    blurb:
      "Clears the general education requirements now and leaves the term free for the " +
      "concentration later, when more of it is on offer.",
    coursesPerTerm: 0,
    summers: false,
  },
]

/** What a term can still be filled with, ordered the way an option wants it
 *  taken. Held seats are left out on purpose: generating a term is meant to
 *  end with a term of real courses, so a seat is something to resolve rather
 *  than something to add. Anything already somewhere in the plan is out too,
 *  or the term would offer a course the student is taking elsewhere. */
/** Whether putting this course into that term would leave something to warn
 *  about: a term it does not run in, or a prerequisite that does not happen
 *  until later. A generated term hands back a term ready to register, so a
 *  course that would arrive with a warning on it is not offered at all —
 *  there is always another requirement to take instead, and a run that fills
 *  a term with work to fix is worse than one that fills it with less. */
function fits(entry: QueueEntry, term: Term, years: Year[]): boolean {
  if (entry.placeholder) return true
  if (!offeredIn(entry.code).includes(seasonOf(term))) return false

  /* Everything it asks for has to be behind it already: passed, under way, or
     in a term the student has planned before this one. Not "not planned after
     it" — a run that puts a course and the course it depends on into the same
     term has answered nothing, and a requirement nobody has placed yet could
     land anywhere. There is always a lower-level requirement to take instead. */
  const terms = years.flatMap((year) => year.terms)
  const at = terms.findIndex((t) => t.id === term.id)
  const before = terms.slice(0, at === -1 ? terms.length : at)
  return prerequisiteCodes(entry.code).every(
    (code) =>
      heldAlready(code) ||
      before.some((t) => t.courses.some((c) => !c.placeholder && c.code === code))
  )
}

function termQueue(optionId: string, years: Year[], term?: Term): QueueEntry[] {
  const placed = new Set<string>()
  for (const year of years) {
    for (const term of year.terms) {
      for (const course of term.courses) placed.add(`${course.code} ${course.name}`)
    }
  }

  /* Requirements still outstanding, then the courses an elective seat can be
   * filled with. The electives are rotated per option, so the three runs
   * resolve the same seat differently — which is the choice being offered. */
  const turn = Math.max(0, TERM_OPTIONS.findIndex((o) => o.id === optionId))
  /* Each shelf is turned by the option's own number, not the flat list. A seat
   * is filled from its own shelf, so rotating the whole list only reshuffles
   * the finance courses and leaves every option reaching for the same general
   * one — which is how all three came back with the same course. */
  const rotated = Object.values(ELECTIVE_COURSES).flatMap((shelf) => {
    const free = shelf.filter((e) => !placed.has(`${e.code} ${e.name}`))
    if (free.length === 0) return []
    const by = turn % free.length
    return [...free.slice(by), ...free.slice(0, by)]
  })

  const all = [
    ...addableCourses(years).filter((entry) => !entry.placeholder),
    ...rotated,
  ]
  const offered = term ? all.filter((entry) => fits(entry as QueueEntry, term, years)) : all
  if (optionId === "term-general") {
    const general = offered.filter((e) => /general|elective/i.test(e.reason))
    return [...general, ...offered.filter((e) => !general.includes(e))]
  }
  if (optionId === "term-mixed") {
    /* Deal them out one from each reason in turn, so a term takes a spread
     * rather than the first five of one kind. */
    const groups = new Map<string, QueueEntry[]>()
    for (const entry of offered) {
      const list = groups.get(entry.reason) ?? []
      list.push(entry)
      groups.set(entry.reason, list)
    }
    const lists = [...groups.values()]
    const out: QueueEntry[] = []
    for (let i = 0; out.length < offered.length; i += 1) {
      for (const list of lists) if (list[i]) out.push(list[i])
    }
    return out
  }
  return offered
}

/* ------------------------------------------------- changing a draft by hand

   The playground is the planner: courses can be moved, dropped and added
   while a draft is up. Every hand edit leaves the same marks the generator
   leaves, which is what lets the tallies and the canvas agree. */

function mapTerm(years: Year[], termId: string, fn: (term: Term) => Term): Year[] {
  return years.map((year) => ({
    ...year,
    terms: year.terms.map((term) => (term.id === termId ? fn(term) : term)),
  }))
}

/** Moves a course inside a draft. Within a term it is a reorder and nothing is
 *  marked; across terms the card arrives green, saying where it came from. */
export function moveInDraft(
  years: Year[],
  courseId: string,
  toTermId: string,
  toIndex?: number
): Year[] {
  const from = findCourse(years, courseId)
  const to = findTerm(years, toTermId)
  if (!from || !to || from.term.locked || to.locked) return years
  /* What the draft struck out is on its way off the plan, not up for moving. */
  if (from.course.draft?.mark === "moved" || from.course.draft?.mark === "removed") return years

  if (from.term.id === to.id) {
    if (toIndex === undefined || toIndex === from.index) return years
    return mapTerm(years, to.id, (term) => {
      const rest = term.courses.filter((c) => c.id !== courseId)
      return { ...term, courses: [...rest.slice(0, toIndex), from.course, ...rest.slice(toIndex)] }
    })
  }

  const moved: PlannedCourse = {
    /* A term whose classes are not out cannot hold a class. */
    ...asPlannedIn(from.course, to),
    draft: {
      mark: "added",
      note: `You moved this here from ${from.term.name}`,
      order: 0,
      /* A course that was already in the plan leaves a hole behind it. One the
       * draft had added is only being rearranged. */
      relocated: from.course.draft ? from.course.draft.relocated : true,
    },
  }

  const without = mapTerm(years, from.term.id, (term) => ({
    ...term,
    courses: term.courses.filter((c) => c.id !== courseId),
  }))

  return mapTerm(without, to.id, (term) => {
    const at = toIndex ?? term.courses.length
    return { ...term, courses: [...term.courses.slice(0, at), moved, ...term.courses.slice(at)] }
  })
}

/** Drops a course from a draft. One the draft itself added simply goes; one
 *  that was already in the plan is struck through instead, so the change stays
 *  visible until the draft is settled. */
export function removeInDraft(years: Year[], courseId: string): Year[] {
  const found = findCourse(years, courseId)
  if (!found || found.term.locked) return years

  const mark = found.course.draft
  if (mark?.mark === "added" && !mark.relocated) {
    return mapTerm(years, found.term.id, (term) => ({
      ...term,
      courses: term.courses.filter((c) => c.id !== courseId),
    }))
  }

  return mapTerm(years, found.term.id, (term) => ({
    ...term,
    courses: term.courses.map((c) =>
      c.id === courseId
        ? { ...c, draft: { mark: "removed" as const, note: "You removed this", order: 0 } }
        : c
    ),
  }))
}

/** Adds a course to a term. `marked` is false on the plan proper, where an
 *  addition is just a course rather than a proposal. */
/** Puts a course into a seat already in the plan. The seat becomes the course
 *  where it stands — nothing arrives and nothing leaves — and goes on saying
 *  which requirement it was held for. */
export function fillSeat(years: Year[], courseId: string, entry: CatalogEntry): Year[] {
  const found = findCourse(years, courseId)
  if (!found || found.term.locked || !found.course.placeholder) return years

  return mapTerm(years, found.term.id, (term) => ({
    ...term,
    courses: term.courses.map((c) =>
      c.id !== courseId
        ? c
        : {
            ...c,
            code: entry.code,
            name: entry.name,
            placeholder: undefined,
            seat: c.seat ?? { code: c.code, name: c.name },
            classNo: String(2500 + (seq += 1) * 13),
            campus: "Main",
            modality: "In Person",
            gradeOption: "Graded",
            lastActivity: `Added by you, ${GENERATED_ON}`,
          }
    ),
  }))
}

/** Gives a seat back: the course goes and the requirement it was answering
 *  stands in its place again, where it was. */
export function emptySeat(years: Year[], courseId: string): Year[] {
  const found = findCourse(years, courseId)
  if (!found || found.term.locked || !found.course.seat) return years
  const { code, name } = found.course.seat

  return mapTerm(years, found.term.id, (term) => ({
    ...term,
    courses: term.courses.map((c) =>
      c.id !== courseId
        ? c
        : {
            ...c,
            code,
            name,
            placeholder: true,
            seat: undefined,
            /* None of the class's own facts survive it. */
            section: undefined,
            settled: undefined,
            classNo: undefined,
            campus: undefined,
            modality: undefined,
            gradeOption: undefined,
            meetings: undefined,
            instructor: undefined,
            building: undefined,
            room: undefined,
            topic: undefined,
          }
    ),
  }))
}

export function addCourse(
  years: Year[],
  termId: string,
  entry: CatalogEntry,
  marked: boolean,
  /** Where the entry sits in `REMAINING_REQUIREMENTS`, when it came from
   *  there. A seat has no name to be recognised by later. */
  requirement?: number
): Year[] {
  const term = findTerm(years, termId)
  if (!term || term.locked) return years

  const taken = new Set(term.courses.map((c) => c.accent))
  const course: PlannedCourse = {
    id: `u${(seq += 1)}`,
    code: entry.code,
    name: entry.name,
    credits: CREDITS_PER_COURSE,
    placeholder: entry.placeholder,
    ...(requirement == null ? {} : { requirement }),
    /* Its own colour if the term has one spare, which under the credit ceiling
       it always does. */
    accent: ACCENTS.find((a) => !taken.has(a)) ?? nextAccent(),
    ...(entry.placeholder
      ? {}
      : {
          classNo: String(2500 + seq * 13),
          campus: "Main",
          modality: "In Person",
          gradeOption: "Graded",
        }),
    lastActivity: `Added by you, ${GENERATED_ON}`,
    ...(marked ? { draft: { mark: "added" as const, note: "You added this", order: 0 } } : {}),
  }

  return mapTerm(years, termId, (t) => ({ ...t, courses: [...t.courses, course] }))
}

/** Requirements the plan is not holding a place for, which is what there is to
 *  add. The seat comes last: it is the answer when nothing specific is left. */
/** The degree's outstanding requirements: the ones with no term yet. A course
 *  is recognised by its name, wherever it was placed from; a seat only by the
 *  requirement it was dragged out against, since every seat reads alike.
 *
 *  Each comes back with its place in `REMAINING_REQUIREMENTS`, which is the
 *  name a row is dragged under and what a placed seat remembers. */
export function unplacedRequirements(years: Year[]): { entry: CatalogEntry; index: number }[] {
  const placed = new Set<string>()
  const answered = new Set<number>()
  for (const year of years) {
    for (const term of year.terms) {
      for (const course of term.courses) {
        if (course.draft?.mark === "removed") continue
        if (course.requirement != null) answered.add(course.requirement)
        if (!course.placeholder) placed.add(`${course.code} ${course.name}`)
      }
    }
  }

  return REMAINING_REQUIREMENTS.map((entry, index) => ({ entry, index })).filter(
    ({ entry, index }) =>
      !answered.has(index) &&
      (entry.placeholder || !placed.has(`${entry.code} ${entry.name}`))
  )
}

export function addableCourses(years: Year[]): CatalogEntry[] {
  const placed = new Set<string>()
  for (const year of years) {
    for (const term of year.terms) {
      for (const course of term.courses) {
        if (course.draft?.mark !== "removed") placed.add(`${course.code} ${course.name}`)
      }
    }
  }

  const unplaced = REMAINING_REQUIREMENTS.filter(
    /* A seat is a placeholder for a requirement, not a course: holding one
     * does not use it up. */
    (entry) => entry.placeholder || !placed.has(`${entry.code} ${entry.name}`)
  )
  return [...unplaced, REPLACEMENT_SEAT]
}
