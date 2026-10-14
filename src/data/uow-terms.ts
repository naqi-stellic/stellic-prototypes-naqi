/* How UoW says what Stellic says. Each line is a word as the product writes it
 * and as UoW writes it, with its plural where it has one, because "courses"
 * is not a course with an s on UoW's side: schools become faculties. Case is
 * carried over from the word being replaced, so a label stays a label.
 *
 * Read in one pass, so department → school is never then read as school →
 * faculty. */

export type Term = {
  from: string
  to: string
  /** The plural of each, where it is not just an "s" more. */
  fromPlural?: string
  toPlural?: string
  /** A word that has no plural to speak of: "GPA", "advanced standing". */
  singleOnly?: boolean
}

export const UOW_TERMS: Term[] = [
  { from: "course", to: "subject" },
  { from: "major", to: "specialisation" },
  /* Help text calls a course a class where it is talking loosely. */
  { from: "class", to: "subject", fromPlural: "classes" },
  { from: "transfer credit", to: "advanced standing", toPlural: "advanced standing" },
  /* What Stellic calls the credit a student arrives with is what UoW calls
     advanced standing, whether or not it came by transfer. */
  { from: "incoming credit", to: "advanced standing", toPlural: "advanced standing" },
  { from: "advisor", to: "adviser" },
  { from: "school", to: "faculty", toPlural: "faculties" },
  { from: "department", to: "school" },
  { from: "GPA", to: "WAM", singleOnly: true },
  { from: "unit", to: "credit point" },
  { from: "credit", to: "credit point" },
  { from: "schedule", to: "session" },
  { from: "pathway", to: "sequence" },
  { from: "instructor", to: "subject coordinator" },
  /* The first term of the academic year, as UoW says it. */
  { from: "Fall", to: "Autumn", singleOnly: true },
]
