import { matches, type FilterGroup, type FilterState } from "@/components/stellic/filter-bar"
import { ALL_ELECTIVES, ELECTIVE_COURSES, offeredIn, type CatalogEntry } from "@/data/catalog"
import { PREREQ_LABEL, courseDetail, courseLevel } from "@/data/course-detail"
import { eligibility } from "@/data/course-sidebar"

/* The filters the platform's course search has, in its order: one button for
 * each, and what is chosen collected as tags beneath. Everything a course can
 * be asked about comes off the same course detail the sidebar reads, so a
 * course that is in Spring in its sidebar is in Spring here. */

const unique = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b))

/** The filters, with the options the courses being searched can answer them
 *  with. */
export function courseSearchFilters(entries: CatalogEntry[]): FilterGroup[] {
  const details = entries.map((entry) => ({ entry, detail: courseDetail(entry) }))
  const field = (
    id: string,
    label: string,
    options: string[],
    mode: "search" | "menu" = "search"
  ) => ({ id, label, placeholder: `Select ${label.toLowerCase()}`, options, mode })

  return [
    {
      id: "semesters",
      label: "Semesters",
      fields: [field("semesters", "Semesters", ["Fall", "Spring", "Summer"])],
    },
    {
      id: "countsFor",
      label: "Counts for",
      fields: [
        field(
          "countsFor",
          "Counts for",
          unique(
            details.flatMap(({ entry, detail }) => [
              entry.reason,
              ...detail.countsFor.map((item) => item.name),
            ])
          )
        ),
      ],
    },
    {
      id: "availability",
      label: "Availability",
      fields: [field("availability", "Availability", ["Open seats", "Full"], "menu")],
    },
    {
      id: "section",
      label: "Section",
      fields: [field("section", "Section", ["Lecture", "Lab", "Discussion"], "menu")],
    },
    {
      id: "instructor",
      label: "Instructor",
      fields: [
        field(
          "instructor",
          "Instructor",
          unique(details.flatMap(({ detail }) => detail.sections.map((section) => section.who)))
        ),
      ],
    },
    {
      id: "offeredBy",
      label: "Offered By",
      fields: [
        field(
          "offeredBy",
          "Offered By",
          unique(entries.map((entry) => entry.code.split(" ")[0]))
        ),
      ],
    },
    {
      id: "attributes",
      label: "Attributes",
      fields: [
        field("attributes", "Attributes", unique(details.flatMap(({ detail }) => detail.attributes))),
      ],
    },
    {
      id: "campus",
      label: "Campus",
      fields: [field("campus", "Campus", ["Main", "Downtown"], "menu")],
    },
    {
      id: "delivery",
      label: "Delivery Mode",
      fields: [field("delivery", "Delivery Mode", ["In Person", "Online", "Hybrid"], "menu")],
    },
    {
      id: "more",
      label: "More Filters",
      fields: [
        field("eligibility", "Eligibility", [PREREQ_LABEL.met, PREREQ_LABEL.not], "menu"),
        field("level", "Level", ["Undergraduate", "Graduate"], "menu"),
      ],
    },
  ]
}

/** What a course answers each filter with. A seat has no course behind it, so
 *  it answers nothing it has no facts for, and passes Eligibility. */
export function courseAnswers(entry: CatalogEntry, id: string): string | string[] {
  const detail = courseDetail(entry)
  switch (id) {
    case "semesters":
      return entry.placeholder ? [] : offeredIn(entry.code)
    case "countsFor":
      return [...new Set([entry.reason, ...detail.countsFor.map((item) => item.name)])]
    case "availability":
      return detail.sections.some((section) => Number(section.seats.split("/")[0]) > 0)
        ? "Open seats"
        : "Full"
    case "section":
      return "Lecture"
    case "instructor":
      return detail.sections.map((section) => section.who)
    case "offeredBy":
      return entry.code.split(" ")[0]
    case "attributes":
      return detail.attributes
    case "campus":
      return detail.campus
    case "delivery":
      return "In Person"
    case "eligibility":
      /* Read the way the course's own sidebar reads it, which counts a
         prerequisite that is under way, so a course says the same in both. */
      return entry.placeholder || eligibility(entry).met ? PREREQ_LABEL.met : PREREQ_LABEL.not
    case "level":
      return courseLevel(entry.code)
    default:
      return []
  }
}

/** What a search for a course to put in a term starts out narrowed to: what is
 *  offered in that term's season, on the main campus, and open to the student
 *  now. */
export function searchDefaults(termName?: string): FilterState {
  return {
    ...(termName ? { semesters: [termName.split(" ")[0]] } : {}),
    campus: ["Main"],
    eligibility: [PREREQ_LABEL.met],
  }
}

/** The courses that could fill a seat in that term: the ones the search opens
 *  on. The seat says how many there are, so it and the search always agree. */
export function electivesFor(seatCode: string, termName?: string): CatalogEntry[] {
  return (ELECTIVE_COURSES[seatCode] ?? ALL_ELECTIVES).filter((entry) =>
    matches(searchDefaults(termName), (id) => courseAnswers(entry, id))
  )
}
