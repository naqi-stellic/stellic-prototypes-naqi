import { cn } from "cn"

import { Icon } from "@/components/icon"
import { CourseTags } from "@/components/stellic/course-metadata"
import { STATUS_BAR, YearMarker } from "@/components/stellic/planner"
import { AuditIcon } from "@/components/stellic/primitives"
import { Card } from "@/components/ui/card"
import {
  INCOMING_CREDITS,
  groupCredits,
  incomingTotals,
  type IncomingCredit,
  type IncomingGroup,
} from "@/data/incoming"

/* What the student arrived with, above the first year and folded away like it.
 * Built like a year — the same rail, the same heading, the same cards in a row
 * — but it is three kinds of credit rather than three terms, because none of
 * this was taken on a timetable this plan knows anything about. */

export const INCOMING_LABEL = "Incoming Credits"

function CreditRow({ item }: { item: IncomingCredit }) {
  return (
    <div className="relative flex w-full items-center gap-2 rounded-md border border-gray-40 bg-card px-[15px] py-[7px]">
      {/* Earned already, so the bar a completed course carries. */}
      <span
        aria-hidden="true"
        className={cn("absolute inset-y-0 left-0 w-1 rounded-l-[3px]", STATUS_BAR.taken)}
      />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
        <div>
          <p className="text-body-md text-gray-100">{item.code}</p>
          <p className="text-body-md font-semibold text-foreground">{item.name}</p>
        </div>
        {/* Where a course card says which class you are in, this says where
            the credit came from — and says nothing at all for a course of ours,
            which came from here. */}
        {item.detail && <p className="text-body-md text-gray-80">{item.detail}</p>}
        {/* The credits are a detail like any other, so they are shown when Plan
            details is showing them and not otherwise. */}
        <CourseTags
          course={{ id: item.id, code: item.code, name: item.name, credits: item.credits }}
        />
      </div>
    </div>
  )
}

function GroupCard({ group }: { group: IncomingGroup }) {
  const credits = groupCredits(group)

  return (
    <Card className="@container/term w-full min-w-0 gap-0 rounded-md border-gray-40 p-[15px] shadow-none">
      <div className="flex w-full flex-col gap-2">
        <h4 className="truncate text-caption-lg font-semibold text-gray-100">{group.kind}</h4>

        <p className="flex items-center gap-2 pt-4 text-body-md font-semibold text-gray-80">
          <AuditIcon state="completed" />
          Earned ({credits} Credit{credits === 1 ? "" : "s"})
        </p>

        <div className="flex w-full flex-col gap-2">
          {group.items.map((item) => (
            <CreditRow key={item.id} item={item} />
          ))}
        </div>
      </div>
    </Card>
  )
}

export function IncomingCredits({
  groups = INCOMING_CREDITS,
  collapsed,
  onToggleCollapse,
}: {
  groups?: IncomingGroup[]
  collapsed: boolean
  onToggleCollapse: () => void
}) {
  const { items, credits } = incomingTotals(groups)
  const summary = `${items} item${items === 1 ? "" : "s"}, ${credits} credits earned`

  const heading = (
    <button
      type="button"
      onClick={onToggleCollapse}
      aria-expanded={!collapsed}
      className="flex cursor-pointer items-center gap-1 text-h300 font-semibold text-gray-100"
    >
      {INCOMING_LABEL}
      <Icon name={collapsed ? "unfold-more" : "unfold-less"} size={16} />
    </button>
  )

  if (collapsed) {
    return (
      <section className="flex flex-col">
        <div className="flex min-h-9 flex-wrap items-center gap-x-4 gap-y-1">
          <div className="flex min-w-0 items-center gap-2">
            <YearMarker phase="complete" />
            <h3 className="min-w-0">{heading}</h3>
          </div>
          <p className="text-body-md text-gray-80">{summary}</p>
        </div>
      </section>
    )
  }

  return (
    <section className="flex flex-col items-start">
      <div className="flex min-w-0 w-full flex-col items-start">
        <div className="-mb-px flex w-full flex-col pb-2.5">
          <div className="flex min-h-9 w-full flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex min-w-0 items-center gap-2">
              <YearMarker phase="complete" />
              <h3 className="min-w-0">{heading}</h3>
            </div>
            <p className="text-body-md text-gray-80">{summary}</p>
          </div>
        </div>

        {/* The same grid a year's terms stand in, so two cards here are as
            wide as Fall and Spring are — and one card is as wide as the year,
            rather than a half-card with a hole beside it. */}
        <div
          className={cn(
            "grid w-full grid-cols-1 gap-4",
            groups.length === 2 && "@3xl:grid-cols-2",
            groups.length > 2 && "@3xl:grid-cols-2 @6xl:grid-cols-3"
          )}
        >
          {groups.map((group) => (
            <GroupCard key={group.kind} group={group} />
          ))}
        </div>
      </div>
    </section>
  )
}
