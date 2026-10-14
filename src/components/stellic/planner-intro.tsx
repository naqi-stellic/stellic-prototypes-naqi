import { useEffect, useState } from "react"

import { Icon, type IconName } from "@/components/icon"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { courseTags, type MetadataField, type PlannedCourse } from "@/data/plan"

/* Introducing the new planner to a student who already knows the old one: a
 * card that says what changed, then a short tour that spotlights each thing on
 * the real page — the plan's actions one by one, then a term and its
 * registration. Pointing at the real buttons rather than showing a video of
 * them, because a student forgets a video and remembers where they clicked.
 *
 * The card offers a way out up front — "I'll explore myself" — because these
 * are returning students, and some would rather find it on their own.
 *
 * In the prototypes it opens on every load, so it can be shown to one student
 * after another. In the product it would show once. */

/** Where the introduction is: the card, a stop on the tour by its place in
 *  TOUR, or finished. */
type Step = "welcome" | "details" | number | "done"

/** The tour's stops, in order: what to spotlight on the page, and what to say
 *  about it. Found by what the page already marks — the header's buttons by
 *  name, a term by its id — so the tour needs nothing of its own from it. */
const TOUR: { find: string; title: string; body: string; generates?: boolean }[] = [
  {
    find: '[data-tour="plan-actions"] [aria-label="Plan details"]',
    title: "Choose which details show for each course",
    body: "Plan details turns course names, sections, credits and more on or off for every course in your plan.",
  },
  {
    find: '[data-tour="plan-actions"] [aria-label="Generate plan"]',
    generates: true,
    title: "Fill in the rest of your plan",
    body: "Answer a few questions about your pace and preferences, then compare options and pick the one that fits.",
  },
  {
    find: '[data-tour="plan-actions"] [aria-label^="Add remaining"]',
    title: "See what courses you still need to add",
    body: "Open the requirements that do not have a term yet, and drag each one into the term you will take it.",
  },
  {
    find: '[data-term="spring-2027"] h4 button',
    title: "See your schedule",
    body: "Select a term's name to open it. Once its classes are out, it opens on a calendar of your week.",
  },
  {
    find: '[data-term="spring-2027"] [role="alert"]',
    title: "Register from your plan",
    body: "When registration opens, this shows the deadline. Register for every course that is ready in one go.",
  },
]

/** The tour card's width, which placing it against the window needs. */
const CARD = 340

/** What the card names: one line per stop on the tour, in the tour's order
 *  and in its words, so "Show me" walks through exactly what was promised. */
const CHANGES: { icon: IconName; name: string; does: string; generates?: boolean }[] = [
  { icon: "remove-red-eye", name: "Plan details", does: "Choose which details show for each course" },
  {
    icon: "design-services",
    name: "Generate plan",
    does: "Fill in the rest of your plan",
    generates: true,
  },
  { icon: "checklist", name: "Add remaining courses", does: "See what courses you still need to add" },
  { icon: "calendar-month", name: "Term schedules", does: "See your schedule for any term with classes out" },
  { icon: "event-available", name: "Registration", does: "Register for every ready course from your plan" },
]

/** The welcome card and the details step stand the same width, so moving from
 *  one to the other changes what is in the card and nothing about the card. */
const DIALOG = "w-full max-w-[480px]"

/** What a student can decide about a card before they have seen their own:
 *  the details that change what they plan around. The name is always there, so
 *  it is not a choice; activities belong to the term rather than the card; and
 *  who last touched a course is for advisors. Everything else is in Plan
 *  details once they want it. Building and room are one switch, because
 *  nobody wants one without the other. */
const CHOICES: { label: string; fields: MetadataField[] }[] = [
  { label: "Credits", fields: ["credits"] },
  { label: "Section", fields: ["section"] },
  { label: "Modality", fields: ["modality"] },
  { label: "Instructor", fields: ["instructor"] },
  { label: "Campus", fields: ["campus"] },
  { label: "Building and room", fields: ["building", "room"] },
]

/** A course, drawn with the details the student has switched on, so each
 *  switch can be seen to do something. */
const PREVIEW_COURSE: PlannedCourse = {
  id: "preview-course",
  code: "ECON 201",
  name: "Principles of Microeconomics",
  credits: 4,
  section: "Lec-01",
  modality: "In Person",
  instructor: "Prof. A. Duval",
  campus: "Main",
  building: "Coburn Hall",
  room: "Room 405",
}

/** How far the spotlight's ring stands off what it frames. */
const PAD = 6

export function PlannerIntro({
  generators = true,
  details,
  onToggleDetail,
}: {
  /** What Plan details is showing, and how to change it. Where they are not
   *  given there is nothing to ask, and the card goes straight to the tour. */
  details?: MetadataField[]
  onToggleDetail?: (id: string) => void
  /** Whether the planner it introduces offers Generate plan. Where it does
   *  not, the card does not name it and the tour does not stop at it. */
  generators?: boolean
}) {
  const changes = CHANGES.filter((change) => generators || !change.generates)
  const tour = TOUR.filter((stop) => generators || !stop.generates)
  const [step, setStep] = useState<Step>("welcome")
  const [rect, setRect] = useState<DOMRect | null>(null)
  const asking = details != null && onToggleDetail != null

  function startTour() {
    window.scrollTo({ top: 0 })
    document.querySelector("main")?.scrollTo({ top: 0 })
    setStep(0)
  }

  /* Where the current stop is, kept current while the tour is up: the page
     can be resized or scrolled under it. Looked for until it is there, since
     the planner may still be drawing, and brought into view if it is not. */
  useEffect(() => {
    if (typeof step !== "number") return
    let frame = 0
    const find = () => document.querySelector(tour[step].find)
    const measure = () => {
      const target = find()
      if (target) setRect(target.getBoundingClientRect())
      else frame = requestAnimationFrame(measure)
    }
    const target = find()
    if (target) {
      const box = target.getBoundingClientRect()
      if (box.top < 80 || box.bottom > window.innerHeight - 200) {
        target.scrollIntoView({ block: "center" })
      }
    }
    /* The ring slides from the last stop to this one rather than vanishing. */
    frame = requestAnimationFrame(measure)
    window.addEventListener("resize", measure)
    window.addEventListener("scroll", measure, true)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("resize", measure)
      window.removeEventListener("scroll", measure, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  /* Escape leaves the introduction from either step. */
  useEffect(() => {
    if (step === "done") return
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setStep("done")
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [step])

  if (step === "done") return null

  if (step === "welcome") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-100/50 p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="planner-intro-title"
          className={`animate-fade flex ${DIALOG} flex-col overflow-hidden rounded-lg bg-card shadow-2xl`}
        >
          <div className="flex w-full flex-col gap-4 p-6">
            <div className="flex flex-col gap-2 pb-2">
              {asking && <span className="text-label-md text-gray-80">Step 1 of 2</span>}
              <h2 id="planner-intro-title" className="text-h400 font-semibold text-gray-100">
                Your planner has a new look
              </h2>
            </div>

            <ul className="flex flex-col gap-3">
              {changes.map((change) => (
                <li key={change.name} className="flex items-start gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary-0 text-primary-50">
                    <Icon name={change.icon} size={16} />
                  </span>
                  <span className="flex min-w-0 flex-col text-body-md">
                    <span className="font-semibold text-gray-100">{change.name}</span>
                    <span className="text-gray-80">{change.does}</span>
                  </span>
                </li>
              ))}
            </ul>

            <div className="flex w-full items-center gap-2 pt-2">
              <Button className="flex-1" onClick={() => setStep("done")}>
                I'll explore myself
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                autoFocus
                onClick={() => (asking ? setStep("details") : startTour())}
              >
                {asking ? "Next" : "Show me"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (step === "details") {
    /* Only reached from the welcome card when there are details to ask about. */
    if (!details || !onToggleDetail) return null

    const on = (fields: MetadataField[]) => fields.every((field) => details.includes(field))
    const toggle = (fields: MetadataField[]) => {
      const all = on(fields)
      fields.forEach((field) => details.includes(field) === all && onToggleDetail(field))
    }
    const tags = courseTags(PREVIEW_COURSE, details)

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-100/50 p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="planner-details-title"
          className={`animate-fade flex ${DIALOG} flex-col overflow-hidden rounded-lg bg-card shadow-2xl`}
        >
          <div className="flex w-full flex-col gap-4 p-6">
            <div className="flex flex-col gap-2 pb-2">
              <span className="text-label-md text-gray-80">Step 2 of 2</span>
              <h2 id="planner-details-title" className="text-h400 font-semibold text-gray-100">
                Choose which details show for each course
              </h2>
            </div>

            <div className="flex w-full flex-col gap-4">
              <div className="flex min-w-0 flex-col gap-3 rounded-md bg-gray-0 p-4">
                <span className="text-label-md font-semibold text-gray-80 uppercase">Preview</span>
                  <div className="flex items-center gap-2 rounded-md border border-gray-40 bg-card p-[7px]">
                    <Icon name="drag-indicator" size={16} className="text-foreground" />
                    <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
                      <div>
                        <p className="text-body-md text-gray-80">{PREVIEW_COURSE.code}</p>
                        {details.includes("name") && (
                          <p className="text-body-md font-semibold text-foreground">
                            {PREVIEW_COURSE.name}
                          </p>
                        )}
                      </div>
                      {details.includes("section") && (
                        <p className="flex items-center gap-1 text-body-md text-foreground">
                          <Icon name="calendar-today" size={14} />
                          {PREVIEW_COURSE.section}
                        </p>
                      )}
                      {tags.length > 0 && (
                        <span className="flex flex-wrap items-start gap-1">
                          {tags.map((tag) => (
                            <Badge key={tag} variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                        </span>
                      )}
                    </div>
                  </div>
              </div>

              <ul className="flex w-full flex-col gap-3">
                {CHOICES.map((choice) => (
                  <li key={choice.label} className="flex items-center gap-3">
                    <span className="min-w-0 flex-1 text-body-md font-semibold text-gray-100">
                      {choice.label}
                    </span>
                    <Switch
                      checked={on(choice.fields)}
                      onCheckedChange={() => toggle(choice.fields)}
                      aria-label={choice.label}
                    />
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex w-full items-center gap-2 pt-2">
              <Button className="flex-1" onClick={() => setStep("welcome")}>
                Back
              </Button>
              <Button variant="primary" className="flex-1" autoFocus onClick={startTour}>
                Show me
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* A stop on the tour: everything dims but the one thing it is about, and a
     card beside it says what that is. The page under the dim does not take
     clicks — the tour moves on with Next, back with Back, and out with Skip
     tour, Done or Escape. */
  const stop = tour[step]
  const last = step === tour.length - 1
  const ring = rect && {
    top: rect.top - PAD,
    left: rect.left - PAD,
    width: rect.width + PAD * 2,
    height: rect.height + PAD * 2,
  }
  /* Under the thing where there is room, over it where there is not; centred
     on it, and kept 16px inside the window either side. */
  const below = ring ? ring.top + ring.height + 220 < window.innerHeight : true
  const left = ring
    ? Math.min(
        Math.max(16, ring.left + ring.width / 2 - CARD / 2),
        window.innerWidth - CARD - 16
      )
    : 0
  const notch = ring ? Math.min(Math.max(16, ring.left + ring.width / 2 - left - 6), CARD - 28) : 0

  return (
    <div className="fixed inset-0 z-50">
      {ring && (
        <>
          <div
            aria-hidden="true"
            style={{ ...ring, boxShadow: "0 0 0 9999px rgb(21 27 38 / 0.55)" }}
            className="pointer-events-none absolute rounded-lg ring-2 ring-primary-50 transition-all duration-300"
          />
          <div
            key={step}
            role="dialog"
            aria-modal="true"
            aria-labelledby="planner-tour-title"
            style={{
              left,
              width: CARD,
              ...(below
                ? { top: ring.top + ring.height + 12 }
                : { bottom: window.innerHeight - ring.top + 12 }),
            }}
            className="animate-fade absolute flex flex-col gap-3 rounded-lg bg-card p-5 shadow-2xl"
          >
            {/* The notch points at what the card is about. */}
            <span
              aria-hidden="true"
              style={{ left: notch }}
              className={`absolute size-3 rotate-45 bg-card ${below ? "-top-1.5" : "-bottom-1.5"}`}
            />
            <h2 id="planner-tour-title" className="text-caption-lg font-semibold text-gray-100">
              {stop.title}
            </h2>
            <p className="text-body-md text-gray-80">{stop.body}</p>
            <div className="flex w-full items-center gap-2 pt-1">
              <span className="text-label-md text-gray-80">
                {step + 1} of {tour.length}
              </span>
              {!last && (
                <button
                  type="button"
                  onClick={() => setStep("done")}
                  className="cursor-pointer text-label-md text-gray-80 underline [text-underline-position:from-font]"
                >
                  Skip tour
                </button>
              )}
              <span className="flex-1" />
              {step > 0 && <Button onClick={() => setStep(step - 1)}>Back</Button>}
              <Button
                variant="primary"
                autoFocus
                onClick={() => setStep(last ? "done" : step + 1)}
              >
                {last ? "Done" : "Next"}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
