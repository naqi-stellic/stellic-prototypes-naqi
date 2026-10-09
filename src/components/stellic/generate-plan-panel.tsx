import { cn } from "cn"
import { useState } from "react"

import { Icon } from "@/components/icon"
import { GeneratePlanBuilding } from "@/components/stellic/generate-plan-building"
import { GeneratePlanNotes } from "@/components/stellic/generate-plan-notes"
import {
  GeneratePlanPace,
  INITIAL_PACE,
  PACE_CREDITS,
  describePace,
  type PaceState,
} from "@/components/stellic/generate-plan-pace"
import {
  GeneratePlanOptions,
  type PlanOptionSummary,
} from "@/components/stellic/generate-plan-options"
import { planSettings } from "@/components/stellic/plan-settings"
import { GeneratePlanScope } from "@/components/stellic/generate-plan-scope"
import { GeneratePlanSummary } from "@/components/stellic/generate-plan-summary"
import { Button } from "@/components/ui/button"
import { CREDITS_PER_COURSE, type PlanStanding, type Term } from "@/data/plan"

/* The Generate Plan wizard that opens beside the planner. Three questions, then
 * a review of the answers. Padding subtracts the border width where a container
 * is stroked (see button.tsx for why). */

const TOTAL_STEPS = 3

/** The pacing answer as a number of courses a term, which is how the generator
 *  thinks about a term's load. */
function coursesPerTerm(pace: PaceState): number {
  const credits = PACE_CREDITS[pace.pace] ?? pace.maxCredits
  return Math.max(1, Math.round(credits / CREDITS_PER_COURSE))
}

/** One line reading the wizard's answers back, for the draft's instructions. */
function instructions(
  keepPlanned: string,
  released: number,
  pace: PaceState,
  notes: string,
  placeholders: number
): string {
  const parts = [
    describePace(pace),
    keepPlanned === "yes"
      ? "kept everything planned"
      : `left ${released} course${released === 1 ? "" : "s"} open`,
  ]
  if (placeholders > 0) {
    parts.push(`${placeholders} placeholder seat${placeholders === 1 ? "" : "s"}`)
  }
  if (notes.trim()) parts.push(`"${notes.trim()}"`)
  return parts.join(" · ")
}

/** The three questions, then the review, the run, and the options the run came
 * up with. Only the questions are numbered steps. */
type View = 1 | 2 | 3 | "summary" | "building" | "options"

export function GeneratePlanPanel({
  standing,
  graduation,
  campus,
  terms,
  keepTerms,
  onFraming,
  options,
  selectedOption,
  placeholders,
  onSelectOption,
  onGenerated,
  onDiscardDraft,
  onApply,
  onClose,
}: {
  standing: PlanStanding
  graduation: string
  campus: string
  /** Terms the pacing step can include or exclude, summers included. */
  terms: string[]
  /** Terms whose courses can be kept or released. */
  keepTerms: Term[]
  /** The drafts the run produced, once there are any. */
  options: PlanOptionSummary[]
  selectedOption: string
  /** Seats the chosen draft is holding for a requirement with no course yet. */
  placeholders: number
  onSelectOption: (id: string) => void
  /** The run has reached its last step: frame the playground, ready for what
   *  is about to fill it. */
  onFraming: () => void
  /** The run is over: put the draft on the canvas, built to this many courses
   *  a term — the pace the student asked for. */
  onGenerated: (coursesPerTerm: number, released: string[]) => void
  /** Take the draft back off the canvas so the answers can be changed. */
  onDiscardDraft: () => void
  /** Asks to apply the option on the canvas; absent until there is one. */
  onApply?: () => void
  onClose: () => void
}) {
  const [view, setView] = useState<View>(1)

  /* The answers live here so the summary can read back exactly what was given,
   * and so Back never loses anything. */
  const [keepPlanned, setKeepPlanned] = useState("yes")
  const [pace, setPace] = useState<PaceState>(INITIAL_PACE)
  /* Empty, the way a box is. Clicking into it fills it in — the instruction is
     the hinge of the whole run, and watching it arrive is the point where the
     room understands that the plan answers it. */
  const [notes, setNotes] = useState("")
  /* Courses the student has taken off the "keep" list, so the generator may
   * move them. Empty while the answer is yes. */
  const [released, setReleased] = useState<string[]>([])
  /* Whether the instructions card is open. Editing does not touch the draft:
   * it stays on the canvas until it is re-generated or left. */
  const [editing, setEditing] = useState(false)
  /* The answers the draft on the canvas was built from, so the card can tell
   * whether there is anything new to run. */
  const [generatedFrom, setGeneratedFrom] = useState<string | null>(null)
  const answers = JSON.stringify({ keepPlanned, pace, notes, released })
  /* A step opened from Edit Settings is a detour, not the wizard running: it
   * goes back where it came from rather than on to the next question. */
  const [detour, setDetour] = useState(false)

  function startOver() {
    setKeepPlanned("yes")
    setReleased([])
    setPace(INITIAL_PACE)
    setNotes("")
    setEditing(false)
    setDetour(false)
    setGeneratedFrom(null)
    onDiscardDraft()
    setView(1)
  }

  const isSummary = view === "summary"
  /* Only the three questions are numbered, so everything after them hides the
   * counter and the progress bars. */
  const isStep = view === 1 || view === 2 || view === 3

  return (
    <aside className="@container flex h-full w-full flex-col overflow-x-clip overflow-y-auto bg-card">
      <header
        className={cn(
          "flex shrink-0 flex-col border-b border-gray-40 px-6 pt-3 pb-[15px]",
          isStep && "gap-2"
        )}
      >
        <div className="flex w-full items-center gap-2">
          {/* Baseline, not centre: two runs of text on one line read as
              aligned when they sit on the same baseline, and cap-centring a
              small label beside a larger title leaves it floating two pixels
              high. */}
          <div className="flex min-w-0 flex-1 items-baseline gap-2">
            <h2 className="text-caption-lg font-semibold text-foreground">Generate Plan</h2>
            {isStep && (
              <span className="text-overline font-medium tracking-[0.5px] text-gray-80 uppercase">
                Step {view} of {TOTAL_STEPS}
              </span>
            )}
          </div>
          <Button variant="ghost" size="icon" aria-label="Close Generate Plan" onClick={onClose}>
            <Icon name="s-close" size={16} />
          </Button>
        </div>

        {isStep && (
          <div className="flex w-full items-start gap-2">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1 min-w-0 flex-1 rounded-md",
                  i < (view as number) ? "bg-primary-50" : "bg-gray-40"
                )}
              />
            ))}
          </div>
        )}
      </header>

      <div className="flex flex-1 flex-col gap-8 p-6 pb-28">
        {view === 1 && (
          <GeneratePlanScope standing={standing} graduation={graduation} />
        )}

        {view === 2 && (
          <GeneratePlanPace
            terms={terms}
            standing={standing}
            keepPlanned={keepPlanned}
            onKeepPlannedChange={(next) => {
              setKeepPlanned(next)
              /* Going back to yes puts everything back on the list. */
              if (next === "yes") setReleased([])
            }}
            keepTerms={keepTerms}
            released={released}
            onReleasedChange={setReleased}
            state={pace}
            onChange={setPace}
          />
        )}

        {view === 3 && <GeneratePlanNotes value={notes} onChange={setNotes} />}

        {view === "building" && (
          <GeneratePlanBuilding
            standing={standing}
            onLastStep={onFraming}
            onDone={() => {
              onGenerated(coursesPerTerm(pace), keepPlanned === "no" ? released : [])
              setGeneratedFrom(answers)
              setView("options")
            }}
          />
        )}

        {view === "options" && (
          <GeneratePlanOptions
            instructions={instructions(keepPlanned, released.length, pace, notes, placeholders)}
            settings={planSettings({
              standing,
              graduation,
              campus,
              keepPlanned,
              released: released.length,
              pace,
              notes,
            })}
            editing={editing}
            options={options}
            selected={selectedOption}
            onSelect={onSelectOption}
            onEdit={() => setEditing(true)}
            onCancelEdit={() => setEditing(false)}
            onEditStep={(step) => {
              setDetour(true)
              setView(step)
            }}
            onStartOver={startOver}
            canRegenerate={generatedFrom !== null && generatedFrom !== answers}
            onRegenerate={() => {
              /* The old draft comes off the canvas while the new one is built. */
              onDiscardDraft()
              setEditing(false)
              setView("building")
            }}
            onApply={editing ? undefined : onApply}
          />
        )}

        {isSummary && (
          <GeneratePlanSummary
            standing={standing}
            graduation={graduation}
            campus={campus}
            keepPlanned={keepPlanned}
            released={released.length}
            pace={pace}
            notes={notes}
            onEdit={(step) => setView(step)}
          />
        )}

        {/* The run finishes on its own; the options are settled on the canvas,
            by the draft bar. Neither needs a footer. */}
        {view !== "building" && view !== "options" && (
          <div className="flex w-full items-center gap-2">
            {isSummary ? (
              <>
                <Button className="flex-1" onClick={startOver}>
                  Start over
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => setView("building")}
                >
                  Generate Plan
                </Button>
              </>
            ) : detour ? (
              /* One way out of a detour: back to the plan you left, with the
                 answer you came to change. */
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => {
                  setDetour(false)
                  setView("options")
                }}
              >
                Done
              </Button>
            ) : (
              <>
                {(view as number) > 1 && (
                  <Button
                    className="flex-1"
                    onClick={() => setView(((view as number) - 1) as View)}
                  >
                    Back
                  </Button>
                )}
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() =>
                    setView(view === TOTAL_STEPS ? "summary" : (((view as number) + 1) as View))
                  }
                >
                  Continue
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
