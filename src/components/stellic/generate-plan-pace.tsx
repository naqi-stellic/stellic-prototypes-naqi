import { Icon } from "@/components/icon"
import { KeepPicker } from "@/components/stellic/keep-picker"
import { RadioCard } from "@/components/stellic/primitives"
import { TermMultiSelect } from "@/components/stellic/term-multi-select"
import { Button } from "@/components/ui/button"
import { RadioGroup } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { PLANNING_RULES, type PlanStanding, type Term } from "@/data/plan"

/* Step 2: how many credits a term, which terms are in play, and what to keep
 * of the plan you already have. */

/** What each named pace means in credits — the one place that decides, so the
 *  radio's own description and the load the generator plans to agree. */
export const PACE_CREDITS: Record<string, number> = { "full-time": 15, "part-time": 9 }

const PACES = [
  {
    value: "full-time",
    label: "Full-time",
    detail: `${PACE_CREDITS["full-time"]} credits a term, no summers`,
  },
  {
    value: "part-time",
    label: "Part-time",
    detail: `${PACE_CREDITS["part-time"]} credits a term, no summers`,
  },
  { value: "custom", label: "Custom", detail: "Set credits, include or skip terms" },
] as const

const MIN_CREDITS = 3
/* The institution's own ceiling, so pacing can never exceed what the summary
 * reports as the credit load limit. */
const MAX_CREDITS = PLANNING_RULES.maxCreditsPerTerm

function Stepper({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  /* Three buttons sharing their borders, so the group reads as one control. */
  return (
    <div className="flex items-start">
      <Button
        size="icon"
        aria-label="One less credit"
        disabled={value <= MIN_CREDITS}
        onClick={() => onChange(value - 1)}
        className="-mr-px rounded-r-none"
      >
        <Icon name="remove" size={16} />
      </Button>
      <span className="-mr-px flex h-9 min-w-11 items-center justify-center border border-input bg-card px-[15px] text-button-md font-medium text-foreground shadow-xs">
        {value}
      </span>
      <Button
        size="icon"
        aria-label="One more credit"
        disabled={value >= MAX_CREDITS}
        onClick={() => onChange(value + 1)}
        className="rounded-l-none"
      >
        <Icon name="add" size={16} />
      </Button>
    </div>
  )
}

function ToggleRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string
  checked: boolean
  onCheckedChange: (next: boolean) => void
}) {
  return (
    <div className="flex w-full items-center justify-between gap-2">
      <span className="text-label-md text-foreground">{label}</span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={label} />
    </div>
  )
}

export type PaceState = {
  pace: string
  maxCredits: number
  includeOn: boolean
  include: string[]
  excludeOn: boolean
  exclude: string[]
}

/** One line describing the pacing choice, for the summary. The named paces
 * carry their own meaning, so only a custom one has to spell out its settings. */
export function describePace(state: PaceState): string {
  const option = PACES.find((p) => p.value === state.pace)
  if (state.pace !== "custom") return option?.label ?? "—"

  const clauses = [`Custom, max ${state.maxCredits} credits per term`]
  if (state.includeOn && state.include.length > 0) {
    clauses.push(`include: ${state.include.join(", ")}`)
  }
  if (state.excludeOn && state.exclude.length > 0) {
    clauses.push(`exclude: ${state.exclude.join(", ")}`)
  }
  return clauses.join(", ")
}

export const INITIAL_PACE: PaceState = {
  pace: "full-time",
  maxCredits: 15,
  /* Both term filters start off; turning one on reveals its picker. */
  includeOn: false,
  include: [],
  excludeOn: false,
  exclude: [],
}

/** The two ways to treat what is already planned. */
/** The two answers, worded to fit on one line beside the label — the same
 *  question is asked of a single term, so it is written once here. */
export function keepChoices(planned: number) {
  return [
    {
      value: "yes",
      label: "Yes",
      detail: `Keep all ${planned} course${planned === 1 ? "" : "s"}, fill the gaps`,
    },
    {
      value: "no",
      label: "No",
      detail: "Choose what stays, move the rest",
    },
  ]
}

export function GeneratePlanPace({
  terms,
  standing,
  keepPlanned,
  onKeepPlannedChange,
  keepTerms,
  released,
  onReleasedChange,
  state,
  onChange,
}: {
  terms: string[]
  standing: PlanStanding
  keepPlanned: string
  onKeepPlannedChange: (next: string) => void
  /** The terms whose courses are up for keeping, when the answer is no. */
  keepTerms: Term[]
  released: string[]
  onReleasedChange: (next: string[]) => void
  state: PaceState
  onChange: (next: PaceState) => void
}) {
  const set = <K extends keyof PaceState>(key: K, value: PaceState[K]) =>
    onChange({ ...state, [key]: value })

  return (
    <>
      <div className="flex w-full flex-col gap-2">
        <h3 className="text-h400 font-semibold text-black">
          How do you want to pace your journey?
        </h3>
        <p className="text-body-md text-gray-80">
          This sets how many credits we plan per term.
        </p>
      </div>

      <div className="flex w-full flex-col gap-2">
        <div className="flex w-full items-center pb-2">
          <h4 className="flex-1 text-body-md font-semibold text-gray-100">Your desired pacing</h4>
        </div>

        <RadioGroup
          value={state.pace}
          onValueChange={(value) => set("pace", value)}
          className="w-full gap-2"
        >
          {PACES.map((option) => {
            const active = state.pace === option.value
            return (
              <RadioCard
                key={option.value}
                value={option.value}
                label={option.label}
                detail={option.detail}
                selected={active}
              >
                {option.value === "custom" && active && (
                  /* 28px lines the settings up under the radio's label. */
                  <div className="flex w-full flex-col gap-2 pl-7">
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="text-label-md text-foreground">Max credits per term</span>
                      <Stepper
                        value={state.maxCredits}
                        onChange={(next) => set("maxCredits", next)}
                      />
                    </div>

                    <ToggleRow
                      label="Include specific terms"
                      checked={state.includeOn}
                      onCheckedChange={(next) => set("includeOn", next)}
                    />
                    {state.includeOn && (
                      <TermMultiSelect
                        options={terms}
                        selected={state.include}
                        onChange={(next) => set("include", next)}
                        placeholder="Search terms to include"
                      />
                    )}

                    <ToggleRow
                      label="Exclude specific terms"
                      checked={state.excludeOn}
                      onCheckedChange={(next) => set("excludeOn", next)}
                    />
                    {state.excludeOn && (
                      <TermMultiSelect
                        options={terms}
                        selected={state.exclude}
                        onChange={(next) => set("exclude", next)}
                        placeholder="Search terms to exclude"
                      />
                    )}
                  </div>
                )}
              </RadioCard>
            )
          })}
        </RadioGroup>
      </div>

      <div className="flex w-full flex-col gap-2">
        <div className="flex w-full items-center pb-2">
          <h4 className="flex-1 text-body-md font-semibold text-gray-100">
            Keep everything already planned?
          </h4>
        </div>

        <RadioGroup
          value={keepPlanned}
          onValueChange={onKeepPlannedChange}
          className="w-full gap-2"
        >
          {keepChoices(standing.planned.reqs).map((choice) => (
            <RadioCard
              key={choice.value}
              value={choice.value}
              label={choice.label}
              detail={choice.detail}
              selected={keepPlanned === choice.value}
            />
          ))}
        </RadioGroup>

        {keepPlanned === "no" && (
          <KeepPicker terms={keepTerms} released={released} onChange={onReleasedChange} />
        )}
      </div>
    </>
  )
}
