import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import { Courses } from "@/pages/courses"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Courses />
  </StrictMode>
)
