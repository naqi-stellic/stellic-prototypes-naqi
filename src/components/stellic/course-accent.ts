import type { PlannedCourse } from "@/data/plan"

/* The colour a course is drawn in on the scheduler: the bar down the left of
 * its card, its block on the week. Blues and purples only — green, orange and
 * amber belong to the status of a course, and gray to the progress bar's
 * remaining courses — so a course with no accent of its own still gets one
 * from the same palette, the same one every time. */

const ACCENT: Record<NonNullable<PlannedCourse["accent"]>, string> = {
  navy: "bg-course-navy",
  sky: "bg-course-sky",
  magenta: "bg-course-magenta",
  blue: "bg-course-blue",
  lavender: "bg-course-lavender",
  violet: "bg-course-violet",
}
const ORDER = Object.keys(ACCENT) as (keyof typeof ACCENT)[]

type Coloured = { id: string; accent?: PlannedCourse["accent"] }

/** The bar for one course or activity. Given the term it stands in, a thing
 *  with no colour of its own takes one that nothing else in that term has —
 *  two cards side by side are never the same colour — and only once all six
 *  are spoken for does a colour come round again. */
export function accentBar(
  item?: Coloured,
  term?: { courses: Coloured[]; activities?: Coloured[] }
): string {
  if (!item) return ACCENT[ORDER[0]]
  if (item.accent) return ACCENT[item.accent]
  if (term) {
    const all = [...term.courses, ...(term.activities ?? [])]
    const taken = new Set(all.map((c) => c.accent).filter(Boolean))
    const free = ORDER.filter((key) => !taken.has(key))
    const place = all.filter((c) => !c.accent).findIndex((c) => c.id === item.id)
    if (place >= 0) {
      return ACCENT[place < free.length ? free[place] : ORDER[(place - free.length) % ORDER.length]]
    }
  }
  let hash = 0
  for (const char of item.id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return ACCENT[ORDER[hash % ORDER.length]]
}
