import { cn } from "cn"

import { Icon, type IconName } from "@/components/icon"
import { DEGREE, type PlanStanding } from "@/data/plan"

/* Step 1: where the student stands, and what the plan is for. The questions
 * themselves start at step 2. */

type Segment = { share: number; className: string }

/** Leading segments take their share of the width; the last one absorbs the
 *  remainder, so the bar always fills exactly. */
function ProgressBar({ segments }: { segments: Segment[] }) {
  /* Only the shares that are actually there. A segment of nothing still drew
     its own divider, which put a hairline at the head of the bar. */
  const shown = segments.filter((segment, i) => i === segments.length - 1 || segment.share > 0)

  return (
    /* The pill is the bar's shape rather than its first and last segments', so
       both ends stay round whichever shares happen to be in it. */
    <div className="flex h-2 w-full items-start overflow-hidden rounded-full">
      {shown.map((segment, i) => {
        const last = i === shown.length - 1
        return (
          <div
            key={i}
            className={cn(
              "h-full",
              last ? "min-w-0 flex-1" : "border-r border-white",
              segment.className
            )}
            style={last ? undefined : { width: `${segment.share * 100}%` }}
          />
        )
      })}
    </div>
  )
}

function Tally({ items }: { items: { icon: IconName; tone: string; value: number }[] }) {
  /* The same rule the bar follows: nothing of a share means no share. */
  const held = items.filter((item) => item.value > 0)

  return (
    <div className="flex flex-wrap items-center gap-x-[17px]">
      {held.map((item) => (
        <span
          key={item.icon + item.value}
          className="flex items-center gap-1 text-body-md text-gray-80"
        >
          <Icon name={item.icon} size={16} className={item.tone} />
          {item.value}
        </span>
      ))}
    </div>
  )
}

export function GeneratePlanScope({
  standing,
  graduation,
}: {
  standing: PlanStanding
  graduation: string
}) {
  const courses = standing.total.reqs

  /* What the plan is for, which is more than one thing: the degree and the
     minor are both programmes with requirements to place, so they are both
     under Programs, each on its own line. */
  const planning: { label: string; values: string[] }[] = [
    { label: "Programs", values: [DEGREE.program, `Minor in ${DEGREE.minor}`] },
    { label: "Concentration", values: [DEGREE.concentration] },
    { label: "Expected Graduation", values: [graduation] },
  ]

  return (
    <>
      <div className="flex w-full flex-col gap-2">
        <h3 className="text-h400 font-semibold text-black">
          Let's plan the rest of your journey
        </h3>
        <p className="text-body-md text-gray-80">
          Answer three questions and we'll draft a term-by-term plan. You can change anything
          before you save it.
        </p>
      </div>

      <div className="flex w-full flex-col gap-6">
        <div className="flex w-full flex-col gap-2">
          <p className="text-body-md font-semibold text-gray-100">Progress</p>
          {/* Four states, because the student is in four of them at once: the
              credit they arrived with, the term they are sitting in, the terms
              they have planned, and everything still to place. */}
          <ProgressBar
            segments={[
              { share: standing.completed.reqs / courses, className: "bg-success-50" },
              { share: standing.inProgress.reqs / courses, className: "bg-warning-50" },
              { share: standing.planned.reqs / courses, className: "bg-warning-25" },
              { share: 0, className: "bg-gray-5" },
            ]}
          />
          <Tally
            items={[
              { icon: "check", tone: "text-success-50", value: standing.completed.reqs },
              { icon: "watch-later", tone: "text-warning-50", value: standing.inProgress.reqs },
              { icon: "calendar-month", tone: "text-warning-25", value: standing.planned.reqs },
              { icon: "crop-square", tone: "text-alert-50", value: standing.remaining.reqs },
            ]}
          />
        </div>

      </div>

      <div className="flex w-full flex-col gap-2">
        <div className="flex items-center pb-2">
          <h4 className="text-body-md font-semibold text-gray-100">What we&rsquo;re planning</h4>
        </div>
        {planning.map((row) =>
          row.values.map((value, i) => (
            <div
              key={value}
              className="flex w-full flex-col gap-x-2 @xs:flex-row @xs:items-start"
            >
              {/* The label names the group, so a second programme sits under
                  the first rather than repeating it. */}
              <span className="text-body-md text-gray-80 @xs:w-[150px] @xs:shrink-0">
                {i === 0 ? row.label : ""}
              </span>
              <span className="min-w-0 flex-1 text-body-md text-gray-100">{value}</span>
              <button
                type="button"
                className="shrink-0 cursor-pointer text-body-md text-gray-80 underline [text-underline-position:from-font]"
              >
                edit
              </button>
            </div>
          ))
        )}
      </div>
    </>
  )
}
