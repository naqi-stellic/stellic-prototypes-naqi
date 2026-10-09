import { cn } from "cn"
import { useState } from "react"

import { Icon } from "@/components/icon"
import { describePace, type PaceState } from "@/components/stellic/generate-plan-pace"
import { DEGREE, INSTITUTION_INSTRUCTIONS, PLANNING_RULES, type PlanStanding } from "@/data/plan"

/* Everything a plan is generated from, in one place: the answers the student
 * gave and the institution settings that apply regardless. The review screen
 * and the Edit Settings card both read from here, so they can't disagree. */

/** Which wizard step owns a row, where one does. A row with no step is a fact
 *  about the degree or the institution rather than an answer. */
export type SettingStep = 1 | 2 | 3

export type SettingRow = {
  label: string
  /** A list where the label covers more than one thing — the programmes a
   *  plan is for, say — which stack under the one label. */
  value: string | string[]
  step?: SettingStep
}

export function planSettings({
  standing,
  graduation,
  campus,
  keepPlanned,
  released,
  pace,
  notes,
}: {
  standing: PlanStanding
  graduation: string
  campus: string
  keepPlanned: string
  /** How many planned courses the student left open for the generator. */
  released: number
  pace: PaceState
  notes: string
}): { choices: SettingRow[]; rules: SettingRow[] } {
  const choices: SettingRow[] = [
    /* Every programme the plan is for, the minor included: it is a programme
       with requirements of its own, not a footnote to the major. */
    { label: "Programs", value: [DEGREE.program, `Minor in ${DEGREE.minor}`] },
    { label: "Concentration", value: DEGREE.concentration },
    { label: "Expected Graduation", value: graduation },
    {
      label: "Keeping",
      value:
        keepPlanned === "yes"
          ? "Everything planned"
          : `${standing.planned.reqs - released} of ${standing.planned.reqs} courses`,
      step: 2,
    },
    { label: "Pacing", value: describePace(pace), step: 2 },
  ]

  /* Nothing typed in step 3 means nothing to read back, so the row goes away
   * rather than reporting its own emptiness. */
  if (notes.trim()) {
    choices.push({ label: "Anything else", value: notes.trim(), step: 3 })
  }

  const rules: SettingRow[] = [
    { label: "Requirement priority", value: PLANNING_RULES.requirementPriority },
    { label: "Campus", value: campus },
    {
      label: "Existing credit",
      value: `${standing.completed.reqs} courses, ${standing.completed.credits} credits`,
    },
    { label: "Prerequisites, co-reqs, anti-reqs", value: PLANNING_RULES.prerequisites },
    { label: "Term offerings", value: "All available" },
    { label: "Credit load limits", value: `max ${PLANNING_RULES.maxCreditsPerTerm} per term` },
    { label: "Institution instructions", value: INSTITUTION_INSTRUCTIONS },
  ]

  return { choices, rules }
}

export function SettingsSection({
  title,
  rows,
  onEdit,
}: {
  /** Left out where something else already heads the rows. */
  title?: string
  rows: SettingRow[]
  /** Given, every row that belongs to a step offers a way back to it. */
  onEdit?: (step: SettingStep) => void
}) {
  return (
    <div className="flex w-full flex-col gap-2 overflow-clip">
      {title && (
        <p className="text-overline font-medium tracking-[0.5px] text-gray-100 uppercase">
          {title}
        </p>
      )}
      {rows.map((row, i) => (
        <div
          key={row.label}
          className={cn("flex w-full items-start gap-2 text-body-md", title && i === 0 && "pt-2")}
        >
          <p className="w-[148px] shrink-0 text-gray-80">{row.label}</p>
          <div className="flex min-w-0 flex-1 flex-col gap-1 text-gray-100">
            {(Array.isArray(row.value) ? row.value : [row.value]).map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          {/* Offered only where it leads somewhere: the step that set it. */}
          {onEdit && row.step && (
            <button
              type="button"
              onClick={() => onEdit(row.step!)}
              className="shrink-0 cursor-pointer text-gray-80 underline [text-underline-position:from-font]"
            >
              edit
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

/** The institution's settings, folded away under one line. They apply
 *  whatever the student answers, so they are there to check rather than to
 *  read every time: the line opens and closes all of them at once. */
export function AccountingFor({
  rows,
  onEdit,
}: {
  rows: SettingRow[]
  onEdit?: (step: SettingStep) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex w-full flex-col gap-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((shown) => !shown)}
        className="flex cursor-pointer items-center gap-1 self-start text-body-md font-semibold text-gray-100"
      >
        Also accounting for
        <Icon name={open ? "expand-more" : "chevron-right"} size={16} className="shrink-0" />
      </button>
      {open && <SettingsSection rows={rows} onEdit={onEdit} />}
    </div>
  )
}
