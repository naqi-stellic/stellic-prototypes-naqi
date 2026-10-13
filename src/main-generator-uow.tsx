import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import { PlannerIntro } from "@/components/stellic/planner-intro"
import { GENERATOR_YEARS } from "@/data/generator-plan"
import { UOW_TERMS } from "@/data/uow-terms"
import { useTerminology } from "@/lib/terminology"
import { PlanYourPath } from "@/pages/plan-your-path"

/* Plan Generator for UoW: the generator prototype, component for component,
 * saying what UoW says. The two differ in the words on the page and nothing
 * about how it works. */

const root = document.getElementById("root")!
/* Before the first render, so the page is never seen in Stellic's words. The
 * whole page rather than the root: menus and dialogs are drawn outside it. */
useTerminology(document.body, UOW_TERMS)

createRoot(root).render(
  <StrictMode>
    <PlanYourPath
      initialYears={GENERATOR_YEARS}
      /* A returning student is shown what changed, over the planner itself. */
      intro={({ shown, toggle }) => <PlannerIntro details={shown} onToggleDetail={toggle} />}
    />
  </StrictMode>
)
