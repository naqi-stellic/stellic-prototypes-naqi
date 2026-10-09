import { cameFrom } from "@/components/stellic/plan-header"
import { PLANNED_YEARS } from "@/data/planned-plan"
import { recordIncoming, recordPlan } from "@/data/record-plan"
import { PlannerIntro } from "@/components/stellic/planner-intro"
import { PlanYourPath } from "@/pages/plan-your-path"

/* The second prototype: the same planner on the same plan, with nothing on
 * offer to generate it. Everything else — term views, the calendar,
 * registration, plan review — is the first prototype's, component for
 * component. This is where the two are allowed to differ, so anything this one
 * wants and the other does not goes here rather than into a second copy of the
 * planner. */

export function Planner() {
  /* Opened from a student's record, the plan is that student's: the same term
     under way, holding the same courses the audit says are in progress. Opened
     on its own it is Team Plan's, which is a different argument about a
     different thing. */
  const fromRecord = cameFrom()

  return (
    <>
    <PlanYourPath
      generators={false}
      /* Opened on its own it is Team Plan's own plan — and a made one: this
         prototype is about working with a plan that exists, so it opens on
         four years of one rather than on the blank the generator starts from. */
      initialYears={fromRecord ? recordPlan() : PLANNED_YEARS}
      incoming={fromRecord ? recordIncoming() : undefined}
    />
    {/* The introduction is for the student. Staff opening a student's plan
        from a record are not being introduced to anything. */}
    {!fromRecord && <PlannerIntro generators={false} />}
    </>
  )
}
