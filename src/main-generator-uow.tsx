import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import { PlannerIntro } from "@/components/stellic/planner-intro"
import { GENERATOR_YEARS } from "@/data/generator-plan"
import { PlanYourPath } from "@/pages/plan-your-path"

/* Plan Generator for UoW: the generator prototype, component for component.
 * This entry is where UoW's data and terminology are to be chosen, so the
 * two prototypes can differ in what they say and nothing about how they work. */

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PlanYourPath
      initialYears={GENERATOR_YEARS}
      /* A returning student is shown what changed, over the planner itself. */
      intro={({ shown, toggle }) => <PlannerIntro details={shown} onToggleDetail={toggle} />}
    />
  </StrictMode>
)
