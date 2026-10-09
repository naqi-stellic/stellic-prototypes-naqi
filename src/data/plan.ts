export type YearPhase = "complete" | "active" | "future"

/** What a generated draft proposes for a course. A moved or removed course
 *  stays on the canvas, struck through, until the draft is settled. */
export type DraftMark = "added" | "moved" | "removed"

/** One meeting of a class: which weekday (1 = Monday) and the hours it runs,
 *  as decimal hours so the calendar can lay it out arithmetically. */
export type Meeting = { day: number; from: number; to: number }

/** Something in a term that is not a course: a club, a job, a commitment the
 *  week has to make room for. It takes no credits and answers no requirement,
 *  but it is on the calendar and it is part of why a term is as full as it
 *  is. */
export type Activity = {
  id: string
  name: string
  /** What kind of thing it is, said the way the student would say it. */
  kind: string
  meetings?: Meeting[]
}

export type PlannedCourse = {
  /** Stable across moves — drag and drop identifies courses by this. */
  id: string
  code: string
  name: string
  credits: number
  section?: string
  /** Note count shown as an inline tally. */
  notes?: number
  /** A requirement with no course chosen for it yet. */
  placeholder?: boolean
  /** The seat this course was put into, as that seat read. A filled seat is
   *  still answering that requirement, so the plan goes on saying which one
   *  above the course that answers it — and can give the seat back. */
  seat?: { code: string; name: string }
  /** The student picked this class themselves. A generated schedule fills in
   *  around it rather than moving it; one a run proposed has no such claim. */
  settled?: boolean
  /** Which of the degree's outstanding requirements this answers, by its place
   *  in that list. Set when one is dragged out of the panel, so a seat leaves
   *  the list once it has a term — a seat cannot be recognised by its name the
   *  way a course can. */
  requirement?: number
  /** Put through registration. Only possible once a class has been chosen and
   *  only while the term's registration window is open. */
  registered?: boolean
  /** Registration detail, known once a class has been chosen. */
  classNo?: string
  campus?: string
  modality?: string
  gradeOption?: string
  /** When the term's schedule is out, where the class actually sits. */
  meetings?: Meeting[]
  /** Where it sat before a draft moved it, so the two can be seen at once. */
  previousMeetings?: Meeting[]
  /* Detail that arrives with a chosen class. A course nobody has picked a
   * section for has none of it, which is why these are all optional: the card
   * shows what the course actually has, never an empty label. */
  instructor?: string
  topic?: string
  building?: string
  room?: string
  /** "Writing Intensive", "Service Learning" — how the section is flagged. */
  attributes?: string
  /** "Full Term", "First Half" — which part of the term it runs in. */
  subTerm?: string
  /** Who last touched this course on the plan, and when. Every course has one,
   *  including one the generator placed, which reads "Added by pathway". */
  lastActivity?: string
  /** The colour this course is drawn in, on its card and on the calendar. */
  accent?: "green" | "amber" | "purple" | "brown" | "teal" | "rose"
  /** Set only while a generated draft is on screen. `relocated` marks a card
   *  that left somewhere to be here, so it counts as an addition and a removal
   *  at once. */
  draft?: { mark: DraftMark; note: string; order: number; relocated?: boolean }
}

export type Term = {
  id: string
  name: string
  /** "Sep - Dec". Credits are summed from the courses, not stored. */
  window: string
  campus?: string
  reviewed: boolean
  /** A term the student is already registered for. Its courses can't be moved
   *  out and nothing can be dropped in. */
  locked?: boolean
  /** Names the credit group once the term holds anything. */
  state: "registered" | "planned" | "completed"
  courses: PlannedCourse[]
  /** Banner slotted between the header and the course list. */
  alert?: { kind: "registration"; closes: string }
  /** The class schedule is published, so this term can be seen on a calendar
   *  rather than only as a list. */
  scheduled?: boolean
  /** What else the term holds. */
  activities?: Activity[]
}

export type Year = {
  label: string
  phase: YearPhase
  terms: Term[]
}

/** Every course in the catalogue carries the same load, which is what makes
 *  40 requirements and 120 credits the same statement twice. */
export const CREDITS_PER_COURSE = 3

/** Whose plan this is. The header names them, and a course they put on the
 *  plan themselves says so by their username. */
export const STUDENT = { name: "Scott Abott", username: "sabott" }

/* Where a course in the plan came from, said the way somebody reading their
 * own plan would say it: the registrar's system, the pathway the programme
 * publishes, the advisor by their first name, or the student themselves — who
 * is reading this, and so is "you".
 *
 * A plan whose every line says the same thing tells you nothing about how it
 * was made. These are the four hands that touched it. */
export const SYNCED = "Synced from SIS, 18 Aug 2026"
export const BY_PATHWAY = "Added by Pathway, 3 Apr 2026"
export const BY_ADVISOR = "Added by Mark, 11 Apr 2026"
export const BY_STUDENT = "Added by you, 2 Sep 2026"

/** The degree the plan is working towards. Requirements are one per course,
 *  which is what makes "5 reqs · 15 credits" read consistently. */
export const DEGREE = {
  program: "Business, B.S.",
  /** What the degree confers. The program is how it is earned; this is the
   *  thing with a name on the certificate, and an audit reads it first — so it
   *  is written the way a certificate writes it rather than abbreviated into
   *  "B.S. Business", which is neither the credential's name nor the
   *  programme's. Three surfaces were already assembling this form out of the
   *  programme name by hand; now there is one of it. */
  credential: "BS in Business",
  /** The program on its own, without the credential trailing it — which is how
   *  it reads once the credential is stated above it. */
  major: "Business",
  concentration: "Finance",
  /** Declared alongside the concentration. Three of the degree's requirements
   *  answer to it rather than to the major, which is what makes the pair worth
   *  saying out loud: no pathway is built for every programme, concentration
   *  and minor there could be. */
  minor: "Data Analytics",
  requirements: 40,
  credits: 120,
}

/** Institution settings the generator always honours. These are facts about
 *  the school rather than answers the student gives, which is why the summary
 *  lists them separately under "Also accounting for". */
export const PLANNING_RULES = {
  requirementPriority: "Core before general",
  prerequisites: "Applied",
  doubleCounting: "Applied",
  /** How far the published catalogue reaches. A plan can run past it — later
   *  terms are projected from the usual pattern rather than confirmed. */
  offeringsThrough: "Spring 2028",
  /** Hard ceiling per term — six courses — and what the custom pacing stepper
   *  clamps to. A full-time term is five. */
  maxCreditsPerTerm: 18,
}

/** The rules said the way instructions are said, short enough to read in a
 *  line or two: what the school has told the generator, which the student can
 *  read but not change. */
export const INSTITUTION_INSTRUCTIONS =
  "Core requirements before general ones, with prerequisites and double counting applied. " +
  `Classes published through ${PLANNING_RULES.offeringsThrough}, and at most ` +
  `${PLANNING_RULES.maxCreditsPerTerm} credits a term.`

/** The same, for a week rather than a degree. */
export const SCHEDULE_INSTITUTION_INSTRUCTIONS =
  "Only sections with seats, on the campuses and in the modalities your programme allows. " +
  "No two of your classes at once, and a class you have chosen stays where it is."


/** Years the student has not planned into yet: two empty terms, nothing locked. */
/** The summer a year can take, between its spring and the next fall. A year
 *  runs fall, spring, summer, and only the summer is optional — which is what
 *  "Add Summer" adds, and why a year that already has one offers nothing. */
export function summerTerm(yearLabel: string): Term {
  const end = Number(yearLabel.split("-")[1])
  return {
    id: `summer-${end}`,
    name: `Summer ${end}`,
    window: "Jun - Aug",
    campus: "Main campus",
    reviewed: false,
    state: "planned",
    courses: [],
  }
}

/** Whether this year still has a term to add. */
export function canAddTerm(year: Year): boolean {
  return year.phase !== "complete" && !year.terms.some((term) => term.id.startsWith("summer-"))
}

/** Adds the summer to a year, after its spring. */
export function addTerm(years: Year[], yearLabel: string): Year[] {
  return years.map((year) =>
    year.label !== yearLabel || !canAddTerm(year)
      ? year
      : { ...year, terms: [...year.terms, summerTerm(year.label)] }
  )
}

/** Adds the year after the last one the plan reaches — the same thing the
 *  generator does for itself when a light pace will not fit, done by hand. */
export function addYear(years: Year[]): Year[] {
  const last = years.at(-1)
  if (!last) return years
  return [...years, emptyYear(Number(last.label.split("-")[0]) + 1)]
}

export function emptyYear(start: number): Year {
  return {
    label: `${start}-${start + 1}`,
    phase: "future",
    terms: [
      {
        id: `fall-${start}`,
        name: `Fall ${start}`,
        window: "Sep - Dec",
        campus: "Main campus",
        reviewed: false,
        state: "planned",
        courses: [],
      },
      {
        id: `spring-${start + 1}`,
        name: `Spring ${start + 1}`,
        window: "Jan - May",
        campus: "Main campus",
        reviewed: false,
        state: "planned",
        courses: [],
      },
    ],
  }
}

export const INITIAL_YEARS: Year[] = [
  {
    label: "2026-2027",
    phase: "active",
    terms: [
      {
        id: "fall-2026",
        name: "Fall 2026",
        window: "Sep - Dec",
        campus: "Main campus",
        reviewed: true,
        locked: true,
        /* Under way, so every class has been chosen and sits somewhere real. */
        scheduled: true,
        state: "registered",
        activities: [
          {
            id: "g1",
            name: "Finance Club",
            kind: "Student organisation",
            meetings: [{ day: 3, from: 17, to: 18 }],
          },
          {
            id: "g2",
            name: "Peer tutoring — Calculus",
            kind: "Campus job",
            meetings: [{ day: 2, from: 16, to: 17.5 }],
          },
        ],
        courses: [
          {
            id: "c1",
            code: "BUS 101",
            name: "Introduction to Business",
            credits: 3,
            section: "Lec-01",
            classNo: "2041",
            campus: "Main",
            modality: "In Person",
            gradeOption: "Graded",
            accent: "purple",
            meetings: [
              { day: 1, from: 9, to: 10.25 },
              { day: 3, from: 9, to: 10.25 },
            ],
            instructor: "Dr. P. Lindqvist",
            building: "Braddock Hall",
            room: "220",
            subTerm: "Full Term",
            lastActivity: SYNCED,
          },
          {
            id: "c2",
            code: "MATH 140",
            name: "Business Calculus",
            credits: 3,
            section: "Lec-01",
            classNo: "2088",
            campus: "Main",
            modality: "In Person",
            gradeOption: "Graded",
            accent: "amber",
            meetings: [
              { day: 2, from: 11, to: 12.25 },
              { day: 4, from: 11, to: 12.25 },
            ],
            instructor: "Prof. D. Sullivan",
            building: "Braddock Hall",
            room: "301",
            subTerm: "Full Term",
            lastActivity: SYNCED,
          },
          {
            id: "c3",
            code: "PSYC 101",
            name: "Introduction to Psychology",
            credits: 3,
            section: "Lec-01",
            classNo: "2113",
            campus: "Main",
            modality: "In Person",
            gradeOption: "Graded",
            accent: "green",
            meetings: [
              { day: 1, from: 13, to: 14.25 },
              { day: 3, from: 13, to: 14.25 },
            ],
            instructor: "Dr. A. Petrov",
            building: "Braddock Hall",
            room: "115",
            subTerm: "Full Term",
            lastActivity: SYNCED,
          },
          {
            id: "c4",
            code: "MIS 120",
            name: "Business Technology Essentials",
            credits: 3,
            section: "Lec-01",
            classNo: "2156",
            campus: "Main",
            modality: "Hybrid",
            gradeOption: "Graded",
            accent: "brown",
            notes: 1,
            meetings: [
              { day: 2, from: 14.5, to: 15.75 },
              { day: 4, from: 14.5, to: 15.75 },
            ],
            instructor: "Dr. L. Whitfield",
            topic: "Spreadsheet Analytics",
            building: "Science Center",
            room: "Lab 1",
            subTerm: "Full Term",
            lastActivity: SYNCED,
          },
          {
            id: "c7",
            code: "ENGL 210",
            name: "Advanced Composition",
            credits: 3,
            section: "Lec-02",
            classNo: "2190",
            campus: "Main",
            modality: "In Person",
            gradeOption: "Graded",
            accent: "teal",
            meetings: [
              { day: 1, from: 10.5, to: 11.75 },
              { day: 3, from: 10.5, to: 11.75 },
            ],
            instructor: "Prof. N. Adeyemi",
            building: "Braddock Hall",
            room: "118",
            attributes: "Writing Intensive",
            subTerm: "Full Term",
            lastActivity: SYNCED,
          },
        ],
      },
      {
        id: "spring-2027",
        name: "Spring 2027",
        window: "Jan - May",
        campus: "Main campus",
        reviewed: false,
        /* Registration for Spring opens during the Fall term and closes at the
           start of Spring — the frame's "Jan 18, 2026" predates the term. */
        alert: { kind: "registration", closes: "Mon Jan 18, 2027 • 11:59pm EST" },
        /* Registration is open for this term, so its classes have times. */
        scheduled: true,
        state: "planned",
        activities: [
          {
            id: "g3",
            name: "Investment Society",
            kind: "Student organisation",
            /* Thursday rather than Friday. A student who has just asked for a
               week with no Friday classes, and got one, should not be looking
               at a Friday with something in it — the block is an activity and
               not a class, which is a distinction nobody makes at a glance. */
            meetings: [{ day: 4, from: 17, to: 18.5 }],
          },
        ],
        courses: [
          {
            /* Registration is open, the schedule is out, and this class has
               been chosen — so it is ready to register. What the term is still
               waiting on is the seat below it, which has no course. */
            id: "c5",
            code: "ACCT 201",
            name: "Financial Accounting",
            credits: 3,
            /* Taught around a theme, which is a thing to have a preference
               about when the schedule is being generated. */
            topic: "Financial Reporting",
            section: "Lec-02",
            settled: true,
            classNo: "2417",
            campus: "Main",
            modality: "In Person",
            gradeOption: "Graded",
            accent: "purple",
            meetings: [
              { day: 1, from: 9, to: 10.25 },
              { day: 3, from: 9, to: 10.25 },
            ],
            instructor: "Dr. A. Ferreira",
            building: "Braddock Hall",
            room: "118",
            subTerm: "Full Term",
            lastActivity: BY_ADVISOR,
          },
          {
            /* A requirement with no course against it yet. A seat has no class
               number, campus or modality — there is no course to have them. */
            id: "c6",
            code: "GEN ELEC",
            name: "General elective",
            credits: 3,
            placeholder: true,
            accent: "amber",
            lastActivity: BY_PATHWAY,
          },
        ],
      },
    ],
  },
  /* Four years of plan, the year under way and three ahead of it. A pace that
   * cannot fit inside them has to add a year of its own. */
  emptyYear(2027),
  emptyYear(2028),
  emptyYear(2029),
]

/* ---------------------------------------------------------------- moves */

export function findCourse(years: Year[], courseId: string) {
  for (const year of years) {
    for (const term of year.terms) {
      const index = term.courses.findIndex((c) => c.id === courseId)
      if (index !== -1) return { term, index, course: term.courses[index] }
    }
  }
  return null
}

export function findTerm(years: Year[], termId: string) {
  for (const year of years) {
    const term = year.terms.find((t) => t.id === termId)
    if (term) return term
  }
  return null
}

/** Moves a course to `toTermId`, at `toIndex` when given, otherwise appending.
 *  Returns the input untouched if either end is locked. */
/** The colours a term's cards are marked by, in the order they are handed out.
 *  Six, which is what the credit ceiling allows a term to hold. */
export const ACCENTS = ["purple", "green", "amber", "teal", "brown", "rose"] as const

/** Every card in a term wearing its own colour.
 *
 *  The accent is how you tell one card from another at a glance — on the week,
 *  on the list, down the side of a row — and two cards in the same colour is
 *  the one thing it must not do. A course keeps the colour it came with where
 *  nothing else in the term has taken it, so a plan does not reshuffle itself
 *  every time something moves; only a clash is given a free colour instead.
 *
 *  Past six there are no colours left and the rest keep what they have, which
 *  is a term already over the credit ceiling. */
export function distinctAccents(term: Term): Term {
  const taken = new Set<PlannedCourse["accent"]>()
  return {
    ...term,
    courses: term.courses.map((course) => {
      if (course.accent && !taken.has(course.accent)) {
        taken.add(course.accent)
        return course
      }
      const free = ACCENTS.find((accent) => !taken.has(accent))
      if (!free) return course
      taken.add(free)
      return { ...course, accent: free }
    }),
  }
}

/** A course as it arrives in the term it was dropped into.
 *
 *  A class belongs to the term whose schedule it was picked from. Carried into
 *  a term whose classes are not published yet, it is a sitting that does not
 *  exist — so the course arrives as a course and nothing more, and the card
 *  stops naming a lecture nobody could register for. Dropped back into a term
 *  that does have a schedule, it asks for a class again, which is what the
 *  term's own line already says about it. */
export function asPlannedIn(course: PlannedCourse, term: Term): PlannedCourse {
  if (term.scheduled || course.placeholder || course.section == null) return course
  return {
    ...course,
    section: undefined,
    meetings: undefined,
    instructor: undefined,
    building: undefined,
    room: undefined,
    /* Nothing was settled by hand here: there was nothing to settle. */
    settled: undefined,
  }
}

export function moveCourse(
  years: Year[],
  courseId: string,
  toTermId: string,
  toIndex?: number
): Year[] {
  const from = findCourse(years, courseId)
  const to = findTerm(years, toTermId)
  if (!from || !to || from.term.locked || to.locked) return years

  const sameTerm = from.term.id === to.id
  if (sameTerm && (toIndex === undefined || toIndex === from.index)) return years

  return years.map((year) => ({
    ...year,
    terms: year.terms.map((term) => {
      if (term.id !== from.term.id && term.id !== to.id) return term

      let courses = term.courses
      if (term.id === from.term.id) courses = courses.filter((c) => c.id !== courseId)
      if (term.id === to.id) {
        const at = toIndex ?? courses.length
        const landing = sameTerm ? from.course : asPlannedIn(from.course, to)
        courses = [...courses.slice(0, at), landing, ...courses.slice(at)]
        /* It may have arrived wearing a colour this term already uses. */
        return sameTerm ? { ...term, courses } : distinctAccents({ ...term, courses })
      }
      return { ...term, courses }
    }),
  }))
}

/** Drops a course from the plan. Registered terms are fixed, so their courses
 *  can't be removed either. */
export function removeCourse(years: Year[], courseId: string): Year[] {
  const found = findCourse(years, courseId)
  if (!found || found.term.locked) return years

  return years.map((year) => ({
    ...year,
    terms: year.terms.map((term) =>
      term.id === found.term.id
        ? { ...term, courses: term.courses.filter((c) => c.id !== courseId) }
        : term
    ),
  }))
}

/* ------------------------------------------------------------- derived */

export function termCredits(term: Term): number {
  /* What a draft has struck out is still on screen but no longer part of the
   * term's load. */
  return term.courses.reduce(
    (sum, c) => (c.draft?.mark === "moved" || c.draft?.mark === "removed" ? sum : sum + c.credits),
    0
  )
}

/** "Sep - Dec • 12 credits • Main campus", with the credit clause dropped
 *  while the term is still empty. */
export function termMeta(term: Term): string {
  const credits = termCredits(term)
  return [term.window, credits > 0 ? `${credits} credits` : null, term.campus]
    .filter(Boolean)
    .join(" • ")
}

export const CREDIT_GROUP_LABEL = {
  registered: "In Progress",
  planned: "Planned",
  completed: "Taken",
  "pre-registered": "Registered",
} as const

/** Where the student stands against the degree. Everything sitting in the
 *  editable plan counts as planned — registered terms included, since those
 *  credits are not earned yet. */
/** The requirement tally, said as a sentence with the empty parts left out.
 *  "0 done, 6 planned, 34 to place" reports a number nobody asked about and
 *  reads as a failure; a student with nothing finished should be told what
 *  there is, not what there is not. */
export function tallyLine(parts: Array<[number, string]>): string {
  const said = parts.filter(([n]) => n > 0).map(([n, label]) => `${n} ${label}`)
  return said.join(", ")
}

export function planStanding(
  years: Year[],
  /** Credit the student arrived with. It sits in no term — that is what makes
   *  it incoming — but it is credit all the same, so a degree that ignored it
   *  would report a student as having done nothing when they walked in with
   *  four courses. */
  carried: { items: number; credits: number } = { items: 0, credits: 0 }
) {
  let doneReqs = carried.items
  let doneCredits = carried.credits
  let goingReqs = 0
  let goingCredits = 0
  let plannedReqs = 0
  let plannedCredits = 0
  let lockedCourses = 0
  for (const year of years) {
    for (const term of year.terms) {
      /* Three states, not two. A finished term is earned. A term under way is
         neither earned nor up for planning — those credits are not the
         student's yet, and the generator cannot move them either. Everything
         else is the plan proper: what there is still to decide about. */
      const done = term.state === "completed"
      for (const course of term.courses) {
        if (done) {
          doneReqs += 1
          doneCredits += course.credits
        } else if (term.locked) {
          goingReqs += 1
          goingCredits += course.credits
        } else {
          plannedReqs += 1
          plannedCredits += course.credits
        }
        if (term.locked) lockedCourses += 1
      }
    }
  }

  return {
    completed: { reqs: doneReqs, credits: doneCredits },
    /** Under way: the term the student is sitting in as they plan. */
    inProgress: { reqs: goingReqs, credits: goingCredits },
    planned: { reqs: plannedReqs, credits: plannedCredits },
    remaining: {
      reqs: Math.max(0, DEGREE.requirements - doneReqs - goingReqs - plannedReqs),
      credits: Math.max(0, DEGREE.credits - doneCredits - goingCredits - plannedCredits),
    },
    total: { reqs: DEGREE.requirements, credits: DEGREE.credits },
    /** Courses the generator has to plan around rather than move. */
    lockedCourses,
  }
}

export type PlanStanding = ReturnType<typeof planStanding>

/** The last term the plan reaches. */
export function expectedGraduation(years: Year[]): string {
  const lastYear = years.at(-1)
  return lastYear?.terms.at(-1)?.name ?? "—"
}

/** Academic year number of the next year to add. The plan opens on the
 *  student's first year, so a plan of four offers a fifth. */
export function nextYearNumber(years: Year[]): number {
  return years.length + 1
}

/** Every term the pacing step can include or exclude: the plan's own terms plus
 *  the summers, which the planner canvas does not show but the student can
 *  still choose to study through. Terms already under way are not on offer. */
export function selectableTerms(years: Year[]): string[] {
  const terms: string[] = []
  for (const year of years) {
    const start = Number(year.label.split("-")[0])
    for (const term of year.terms) {
      if (!term.locked) terms.push(term.name)
    }
    terms.push(`Summer ${start + 1}`)
  }
  return terms
}

/** Campuses the plan actually uses, for the summary's "Campus" row. */
export function planCampuses(years: Year[]): string {
  const seen = new Set<string>()
  for (const year of years) {
    for (const term of year.terms) {
      if (term.campus) seen.add(term.campus.replace(/ campus$/i, ""))
    }
  }
  return seen.size > 0 ? [...seen].join(", ") : "—"
}

/** Roughly how much of the catalogue could fill a held seat. Derived from the
 *  requirement's own code so the same seat always reports the same number — a
 *  broad requirement has thousands to choose from, a narrow one a few hundred. */
export function eligibleCourses(course: PlannedCourse): number {
  const seed = [...course.code].reduce((n, ch) => n + ch.charCodeAt(0), 0)
  return 180 + (seed % 9) * 84 + (seed % 7) * 11
}

/* --------------------------------------------------------- plan details */

/* What "Plan details" can put on a course card. Everything here is off the
 * card until it is switched on, and a field a course has no value for stays
 * off whatever the setting says — a card never carries an empty label. */

export type MetadataField =
  | "name"
  | "section"
  | "credits"
  | "modality"
  | "campus"
  | "instructor"
  | "topic"
  | "building"
  | "room"
  | "attributes"
  | "subTerm"
  | "lastActivity"

export const METADATA_FIELDS: { id: MetadataField; label: string }[] = [
  { id: "name", label: "Course Name" },
  { id: "section", label: "Section" },
  { id: "credits", label: "Credits" },
  { id: "modality", label: "Modality" },
  { id: "campus", label: "Campus" },
  { id: "instructor", label: "Instructor" },
  { id: "topic", label: "Topic" },
  { id: "building", label: "Building" },
  { id: "room", label: "Room" },
  { id: "attributes", label: "Section Attributes" },
  { id: "subTerm", label: "Sub-term" },
  { id: "lastActivity", label: "Last activity" },
]

/** The course's name and nothing else. Without it a card is its code alone,
 *  for a plan that wants to be read compact; the section only matters once
 *  somebody is down at meeting times, so it waits to be asked for. */
export const METADATA_DEFAULT: MetadataField[] = ["name"]

/** What a course can say about itself, in the order the menu lists it. Name,
 *  section and last activity are left out: they are not tags, and the card
 *  gives each its own line. */
export function courseTags(course: PlannedCourse, shown: MetadataField[]): string[] {
  const value: Partial<Record<MetadataField, string | undefined>> = {
    credits: `${course.credits} credits`,
    modality: course.modality,
    campus: course.campus,
    instructor: course.instructor,
    topic: course.topic,
    building: course.building,
    room: course.room,
    attributes: course.attributes,
    subTerm: course.subTerm,
  }

  return METADATA_FIELDS.flatMap(({ id }) => {
    if (id === "name" || id === "section" || id === "lastActivity") return []
    if (!shown.includes(id)) return []
    const text = value[id]
    return text ? [text] : []
  })
}

/* ------------------------------------------------------------ registering */

/** The classes that can go through registration right now: the window has to
 *  be open, a section has to have been chosen, and it cannot already be in.
 *  A seat with no course and anything a draft is still proposing are not
 *  registrable either — there is nothing to put through. */
export function registrableCourses(term: Term): PlannedCourse[] {
  if (!term.scheduled || !term.alert) return []
  return term.courses.filter(
    (c) => !c.registered && !c.placeholder && c.draft == null && c.section != null
  )
}

/** What a term's registration banner says. The button is there only when
 *  something would go through it — never greyed out:
 *  - drafting: a generated plan is up, so nothing is settled to register;
 *  - ready: something can be registered now;
 *  - registered: everything the term holds has gone through;
 *  - left: nothing can go now, but something is still unregistered.
 *  A term with nothing in it yet is simply open, with nothing to press. */
export type RegistrationBanner = {
  state: "drafting" | "ready" | "registered" | "left"
  title: string
  /** The label in front of the closing date. */
  closesLabel: string
  /** A line under the date, where the state needs one. */
  note?: string
  /** What the button registers; absent where there is no button. */
  register?: number
}

export function registrationBanner(term: Term, ready: number): RegistrationBanner {
  const open = { title: "Registration is now open!", closesLabel: "Closes" }
  if (term.courses.some((c) => c.draft)) {
    return {
      state: "drafting",
      ...open,
      note: "Apply or discard your generated plan to register.",
    }
  }
  if (ready > 0) return { state: "ready", ...open, register: ready }
  const left = term.courses.filter((c) => !c.registered).length
  if (term.courses.length > 0 && left === 0) {
    return {
      state: "registered",
      title: `You're registered for ${term.name}`,
      closesLabel: "Add/drop closes",
    }
  }
  if (left === 0) return { state: "ready", ...open }
  return {
    state: "left",
    title: `${left} course${left === 1 ? "" : "s"} left to register`,
    closesLabel: "Closes",
  }
}

/** What a term's credit group is called and marked by. A planned term whose
 *  classes have all gone through registration is not "planned" any more —
 *  everything in it has a seat — so it says so, without becoming a term that
 *  is under way, which it is not until it starts. */
export function creditGroup(term: Term): Term["state"] | "pre-registered" {
  if (term.state !== "planned") return term.state
  const real = term.courses.filter((c) => !c.placeholder && c.draft == null)
  return real.length > 0 && real.every((c) => c.registered) ? "pre-registered" : term.state
}

/** Which group one course sits in. In a term still being planned that is a
 *  fact about the course, not the term: registering some of it leaves the
 *  rest — a seat with nothing in it, say — planned. */
export function courseGroup(term: Term, course: PlannedCourse): Term["state"] | "pre-registered" {
  if (term.state !== "planned") return term.state
  return course.registered ? "pre-registered" : "planned"
}

/** A term's courses under the headings it shows: one group for a term that is
 *  under way or done, and up to two — registered, then planned — for one being
 *  planned, so nothing still to be chosen is listed as registered. */
export function termGroups(
  term: Term
): { state: Term["state"] | "pre-registered"; courses: PlannedCourse[] }[] {
  if (term.state !== "planned") return [{ state: term.state, courses: term.courses }]
  const registered = term.courses.filter((c) => c.registered)
  const planned = term.courses.filter((c) => !c.registered)
  return [
    ...(registered.length > 0 ? [{ state: "pre-registered" as const, courses: registered }] : []),
    ...(planned.length > 0 ? [{ state: "planned" as const, courses: planned }] : []),
  ]
}

/** Puts the named classes through, which is all registering changes. */
export function registerCourses(years: Year[], termId: string, courseIds: string[]): Year[] {
  const ids = new Set(courseIds)
  return years.map((year) => ({
    ...year,
    terms: year.terms.map((term) =>
      term.id !== termId
        ? term
        : {
            ...term,
            courses: term.courses
              .map((c) =>
                /* Registering settles it: the seat it was put into has done its
                   job and stops being a thing of its own, so the course is a
                   course from here on. */
                ids.has(c.id) ? { ...c, registered: true, seat: undefined } : c
              )
              /* Registered first, the way the term lists them. Stable, so each
                 group keeps the order it had. */
              .sort((a, b) => Number(!!b.registered) - Number(!!a.registered)),
          }
    ),
  }))
}

/* The class times a term's sections are drawn from, in the order they are
 * handed out, so two courses in the same term never land on each other.
 *
 * There are more of them than a term has courses on purpose. A run starts from
 * a different one each time, and if the list were only as long as the term it
 * would always end up using every slot — three schedules that differ in which
 * course sits where and not at all in what the week looks like. With slack in
 * the list, starting later means a different set of hours and days. */
export const SECTION_SLOTS: Meeting[][] = [
  /* 0 */ [
    { day: 1, from: 9, to: 10.25 },
    { day: 3, from: 9, to: 10.25 },
  ],
  /* 1 */ [
    { day: 2, from: 11, to: 12.25 },
    { day: 4, from: 11, to: 12.25 },
  ],
  /* 2 */ [
    { day: 1, from: 13, to: 14.25 },
    { day: 3, from: 13, to: 14.25 },
  ],
  /* 3 */ [
    { day: 2, from: 14.5, to: 15.75 },
    { day: 4, from: 14.5, to: 15.75 },
  ],
  /* 4 */ [
    { day: 1, from: 10.5, to: 11.75 },
    { day: 3, from: 10.5, to: 11.75 },
  ],
  /* 5 */ [{ day: 5, from: 9, to: 11.5 }],
  /* 6 */ [
    { day: 2, from: 8, to: 9.25 },
    { day: 4, from: 8, to: 9.25 },
  ],
  /* 7 */ [
    { day: 1, from: 16, to: 17.25 },
    { day: 3, from: 16, to: 17.25 },
  ],
  /* 8 */ [
    { day: 2, from: 9.5, to: 10.75 },
    { day: 4, from: 9.5, to: 10.75 },
  ],
  /* 9 */ [
    { day: 1, from: 15, to: 16.25 },
    { day: 3, from: 15, to: 16.25 },
    { day: 5, from: 15, to: 16.25 },
  ],
  /* 10 */ [{ day: 5, from: 13, to: 15.5 }],
  /* 11 */ [
    { day: 2, from: 16, to: 17.25 },
    { day: 4, from: 16, to: 17.25 },
  ],
]

/** Gives every course in a term that has no section one, drawing from the
 *  slots in turn so the week fills out rather than stacking. `turn` shifts
 *  where it starts, which is what makes one generated schedule differ from
 *  another. */
/* Which slots each run reaches for, and in what order. Three windows onto one
 * list all land on much the same week — take five hours from eight and four of
 * them are the same four every time, so the options differ in which course
 * sits where and hardly at all in what the week looks like. Each option draws
 * on its own part of the day instead:
 *
 *   1 — an ordinary week: down the middle of the day, over four days
 *   2 — afternoons and both Friday blocks, the whole week in use
 *   3 — Tuesdays and Thursdays, which gives Monday and Wednesday back whole
 *
 * The first is the one a full term has to look right in, so it is spread from
 * nine to four rather than pushed into any one part of the day: five classes
 * packed into a single morning is a week nobody has. */
const SCHEDULE_ORDERS = [
  [0, 4, 1, 2, 3, 9],
  [5, 2, 11, 10, 7, 3],
  [6, 8, 1, 11, 3, 5],
]

export function scheduleTerm(term: Term, turn = 0): Term {
  /* The option's own slots come first, then whatever it did not name. A term
   * can hold more courses than an order lists, and wrapping round would hand
   * the extra one the hour the first already has — two classes drawn on top of
   * each other, one of them invisible. */
  const named = SCHEDULE_ORDERS[turn % SCHEDULE_ORDERS.length]
  const order = [...named, ...SECTION_SLOTS.map((_, i) => i).filter((i) => !named.includes(i))]

  /* A class the student chose keeps its hour: a run fills in what has none, it
   * does not move what was settled by hand. The hours those hold are struck
   * off the order so nothing is put on top of them. A class an earlier run
   * proposed has no such claim — it is timetabled afresh, and where it used to
   * be is what the week is compared against. */
  const settles = (course: PlannedCourse) =>
    !course.placeholder && (course.registered === true || course.settled === true)
  const held = new Set(
    term.courses
      .filter(settles)
      .map((course) =>
        SECTION_SLOTS.findIndex((slot) => JSON.stringify(slot) === JSON.stringify(course.meetings))
      )
      .filter((index) => index !== -1)
  )
  const free = order.filter((index) => !held.has(index))

  let next = 0
  return {
    ...term,
    courses: term.courses.map((course) => {
      /* A seat has no class to time. */
      if (course.placeholder || settles(course)) return course
      const slot = SECTION_SLOTS[free[next % free.length]]
      next += 1
      /* By value, not by identity: two slots can be the same hours without
       * being the same array, and comparing the arrays themselves quietly
       * reports every class as moved — or none of them. */
      const moved =
        course.meetings != null && JSON.stringify(course.meetings) !== JSON.stringify(slot)
      return {
        ...course,
        section: `Lec-0${(next % 3) + 1}`,
        meetings: slot,
        ...(moved ? { previousMeetings: course.meetings } : {}),
      }
    }),
  }
}

/** Settles a course on a class: the section, where it meets, and everything
 *  else that only exists once one has been picked. Standing in for a real
 *  section search, which would show what is on offer and let you choose. */
export function chooseSection(
  years: Year[],
  termId: string,
  courseId: string,
  /** Whether the student picked this class themselves. A class handed out
   *  because the term's schedule is already open is not their choice, so a
   *  generated schedule is free to move it. */
  byHand = true
): Year[] {
  return years.map((year) => ({
    ...year,
    terms: year.terms.map((term) => {
      if (term.id !== termId) return term
      /* Take the first slot nothing in the term is using, so a term fills up
         its week rather than stacking classes on one hour. */
      const taken = new Set(
        term.courses.flatMap((c) => (c.meetings ?? []).map((m) => `${m.day}-${m.from}`))
      )
      const slot =
        SECTION_SLOTS.find((s) => !s.some((m) => taken.has(`${m.day}-${m.from}`))) ??
        SECTION_SLOTS[0]
      const used = term.courses.filter((c) => c.classNo).length

      return {
        ...term,
        courses: term.courses.map((c) =>
          c.id !== courseId || c.placeholder
            ? c
            : {
                ...c,
                section: "Lec-01",
                /* Chosen by hand, so a generated schedule leaves it be. */
                ...(byHand ? { settled: true } : {}),
                classNo: c.classNo ?? String(3000 + used * 17 + 41),
                meetings: slot,
              }
        ),
      }
    }),
  }))
}

/** Settles a course on the class the student picked by name, rather than on
 *  whatever hour happened to be free. The hours come with it, so the week
 *  draws the sitting they chose and not another one.
 *
 *  A class chosen this way is theirs: a generated schedule leaves it alone,
 *  the same as one settled through the term's own search. */
export function setSection(
  years: Year[],
  termId: string,
  courseId: string,
  section: string,
  meetings: Meeting[]
): Year[] {
  return years.map((year) => ({
    ...year,
    terms: year.terms.map((term) => {
      if (term.id !== termId) return term
      const used = term.courses.filter((c) => c.classNo).length
      return {
        ...term,
        courses: term.courses.map((c) =>
          c.id !== courseId || c.placeholder
            ? c
            : {
                ...c,
                section,
                settled: true,
                classNo: c.classNo ?? String(3000 + used * 17 + 41),
                meetings,
              }
        ),
      }
    }),
  }))
}

/* ------------------------------------------------------------ term view */

/** What is still missing before a course can be registered: a seat held
 *  against a requirement needs a course choosing, and a course with no class
 *  picked needs a section. */
export function courseNeeds(course: PlannedCourse, term: Term): "course" | "section" | null {
  /* Nothing is outstanding in a term whose schedule has not been published. No
   * sections exist to choose between yet, so a course without one is not
   * waiting on anybody — it is simply further out than the catalogue reaches.
   * What such a term is holding is already plain on the planner. */
  if (!term.scheduled) return null
  /* A seat is a requirement with no course against it. The plan is waiting on
     it, but the seat says so itself — calling it an error only invites the
     argument about whether it is one. */
  if (course.placeholder) return null
  /* The section is what is missing, so the section is what to ask about. A
   * class number, campus, modality and grading are known from the course
   * itself long before anybody picks which sitting of it to attend. */
  return course.section ? null : "section"
}

export function courseStatus(
  course: PlannedCourse,
  term: Term
): "registered" | "ready" | "needs review" {
  if (course.registered) return "registered"
  return courseNeeds(course, term) ? "needs review" : "ready"
}

/** The line a course shows when something is missing, and what to press. */
/** The week a term's calendar opens on: a real Monday inside the term, so the
 *  days line up with the weekdays the classes actually meet. */
export function termWeek(term: Term): Date[] {
  const year = Number(term.id.split("-")[1])
  /* A week far enough in for the term to be under way, and taken from the
   * second week of the month so it cannot straddle two of them. */
  const start = term.id.startsWith("fall")
    ? new Date(Date.UTC(year, 9, 8))
    : term.id.startsWith("summer")
      ? new Date(Date.UTC(year, 6, 8))
      : new Date(Date.UTC(year, 2, 8))

  /* Wind back to the Monday of that week. */
  const monday = new Date(start)
  monday.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7))

  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday)
    day.setUTCDate(monday.getUTCDate() + i)
    return day
  })
}

/** The shape of a term's week: which days it meets on, and how early and late
 *  it runs. What a schedule is, reduced to what you would compare. */
export function termShape(term: Term): {
  days: number[]
  earliest: number | null
  latest: number | null
} {
  const meetings = term.courses.flatMap((c) => (c.draft?.mark === "removed" ? [] : (c.meetings ?? [])))
  if (meetings.length === 0) return { days: [], earliest: null, latest: null }
  return {
    days: [...new Set(meetings.map((m) => m.day))].sort(),
    earliest: Math.min(...meetings.map((m) => m.from)),
    latest: Math.max(...meetings.map((m) => m.to)),
  }
}

/** "9:30am", from the decimal hours the data keeps. */
export function clockTime(hour: number): string {
  const h = Math.floor(hour)
  const m = Math.round((hour - h) * 60)
  const suffix = h < 12 ? "am" : "pm"
  const twelve = h % 12 === 0 ? 12 : h % 12
  return `${twelve}:${String(m).padStart(2, "0")}${suffix}`
}

/** The hours a term's calendar has to cover, with an hour's air either side. */
export function termHours(term: Term): { from: number; to: number } {
  const meetings = term.courses.flatMap((c) => [
    ...(c.meetings ?? []),
    ...(c.previousMeetings ?? []),
  ])
  /* The day always opens at eight, wherever the first class is, so two terms
   * read against each other without the hours sliding about. It runs to six in
   * the evening, or later if something does. */
  const from = meetings.length === 0 ? 8 : Math.min(8, Math.floor(Math.min(...meetings.map((m) => m.from))))
  const to = meetings.length === 0 ? 18 : Math.max(18, Math.ceil(Math.max(...meetings.map((m) => m.to)) + 1))
  return { from, to }
}
