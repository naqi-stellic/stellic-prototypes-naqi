import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import { PlannerIntro } from "@/components/stellic/planner-intro"
import { GENERATOR_YEARS } from "@/data/generator-plan"
import { PlanYourPath } from "@/pages/plan-your-path"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PlanYourPath initialYears={GENERATOR_YEARS} />
    {/* A returning student is shown what changed, over the planner itself. */}
    <PlannerIntro />
  </StrictMode>
)
