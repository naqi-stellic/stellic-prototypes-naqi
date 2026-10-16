import { createContext, use } from "react"

import { Badge } from "@/components/ui/badge"
import { courseTags, METADATA_DEFAULT, type MetadataField, type PlannedCourse } from "@/data/plan"

/* Which details "Course details" is currently showing, and how a course card
 * says them. The setting sits above the whole plan rather than being threaded
 * down through years, terms and rows, because every card answers to it and
 * dragging one must not carry a copy of it around. */

const MetadataContext = createContext<MetadataField[]>(METADATA_DEFAULT)

export function MetadataProvider({
  shown,
  children,
}: {
  shown: MetadataField[]
  children: React.ReactNode
}) {
  return <MetadataContext value={shown}>{children}</MetadataContext>
}

export function useMetadata(): MetadataField[] {
  return use(MetadataContext)
}

/** The tags a card carries: one gray badge per detail that is switched on and
 *  that this course actually has. */
export function CourseTags({ course }: { course: PlannedCourse }) {
  const tags = courseTags(course, useMetadata())
  if (tags.length === 0) return null

  return (
    <span className="flex flex-wrap items-start gap-1">
      {tags.map((tag) => (
        <Badge key={tag} variant="secondary">
          {tag}
        </Badge>
      ))}
    </span>
  )
}

/** Who last touched this course, which is the one detail that is not a tag:
 *  the design gives it its own line under them. */
export function CourseActivity({ course }: { course: PlannedCourse }) {
  const shown = useMetadata()
  if (!shown.includes("lastActivity") || !course.lastActivity) return null

  return (
    <span className="text-body-md font-medium text-gray-80">
      {course.lastActivity}
    </span>
  )
}
