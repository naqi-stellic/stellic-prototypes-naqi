import { REMAINING_REQUIREMENTS } from "@/data/catalog"
import {
  distinctAccents,
  BY_PATHWAY,
  BY_STUDENT,
  CREDITS_PER_COURSE,
  INITIAL_YEARS,
  type PlannedCourse,
  type Term,
  type Year,
} from "@/data/plan"

/* Where the generator's prototype starts.
 *
 * Almost nothing: the term under way, a spring the student has begun on, and
 * four years of empty terms for the generator to fill. What little is there is
 * there to be planned around — a class already chosen, and seats held for
 * electives whose courses have not been picked. */

/** Which outstanding requirement a seat written in by hand is holding a place
 *  for. Read by code rather than written as a number, so the list can be
 *  reordered without the plan quietly answering the wrong thing. */
function requirementFor(code: string): number {
  const at = REMAINING_REQUIREMENTS.findIndex((entry) => entry.code === code)
  if (at === -1) throw new Error(`No outstanding requirement for ${code}`)
  return at
}

function seat(id: string, code: string, accent: PlannedCourse["accent"]): PlannedCourse {
  const entry = REMAINING_REQUIREMENTS[requirementFor(code)]
  return {
    id,
    code: entry.code,
    name: entry.name,
    credits: CREDITS_PER_COURSE,
    requirement: requirementFor(code),
    placeholder: true,
    accent,
    lastActivity: BY_PATHWAY,
  }
}

/** The seat Spring 2027 opens holding. The plan the two prototypes share has
 *  a general elective there; this one holds a finance elective instead, which
 *  is what makes the generated plan worth watching: a concentration elective
 *  in the term the student has just said they want lighter is the thing that
 *  has somewhere else to go. */
const SPRING_SEAT = "FIN ELEC"

/** A second course in the spring the student has started on, and two seats a
 *  year out: enough that the plan reads as begun rather than blank, and little
 *  enough that generating one still has four years of work to do. */
const STARTED: Record<string, PlannedCourse[]> = {
  "spring-2027": [
    {
      id: "c10",
      code: "ECON 201",
      name: "Principles of Microeconomics",
      credits: CREDITS_PER_COURSE,
      requirement: requirementFor("ECON 201"),
      section: "Lec-01",
      /* Chosen by the student, the same as the accounting class beside it — so
         a generated schedule builds around it rather than timetabling it
         afresh and drawing a ghost where it used to be. */
      settled: true,
      classNo: "2471",
      campus: "Main",
      modality: "In Person",
      gradeOption: "Graded",
      accent: "sky",
      meetings: [
        { day: 2, from: 11, to: 12.25 },
        { day: 4, from: 11, to: 12.25 },
      ],
      instructor: "Dr. A. Petrov",
      building: "Braddock Hall",
      room: "115",
      subTerm: "Full Term",
      lastActivity: BY_STUDENT,
    },
  ],
  "fall-2027": [seat("c11", "GEN ELEC", "magenta"), seat("c12", "DATA ELEC", "violet")],
}

export const GENERATOR_YEARS: Year[] = INITIAL_YEARS.map((year) => ({
  ...year,
  terms: year.terms.map((rawTerm) => {
    /* The shared plan's spring seat, re-cut as the kind this prototype needs.
       It keeps its id and its place: it is the same seat, held for something
       else. */
    const term: Term =
      rawTerm.id !== "spring-2027"
        ? rawTerm
        : {
            ...rawTerm,
            courses: rawTerm.courses.map((course) => {
              if (!course.placeholder) return course
              const entry = REMAINING_REQUIREMENTS[requirementFor(SPRING_SEAT)]
              return {
                ...course,
                code: entry.code,
                name: entry.name,
                requirement: requirementFor(SPRING_SEAT),
              }
            }),
          }
    const added = STARTED[term.id]
    if (!added) return term
    /* Seats last, the way every other term reads: what has been decided, and
       then what has not. */
    return distinctAccents({
      ...term,
      courses: [
        ...term.courses.filter((c) => !c.placeholder),
        ...added.filter((c) => !c.placeholder),
        ...term.courses.filter((c) => c.placeholder),
        ...added.filter((c) => c.placeholder),
      ],
    })
  }),
}))
