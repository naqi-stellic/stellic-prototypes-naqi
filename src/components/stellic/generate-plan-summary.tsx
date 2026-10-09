import type { PaceState } from "@/components/stellic/generate-plan-pace"
import {
  AccountingFor,
  SettingsSection,
  planSettings,
  type SettingStep,
} from "@/components/stellic/plan-settings"
import type { PlanStanding } from "@/data/plan"

/* The review screen. Every row under "Your choices" reads back an answer the
 * student actually gave in steps 1-3; the rows beneath it are institution
 * settings the generator applies regardless. Both come from planSettings, so
 * this and the Edit Settings card can never drift apart. */

export function GeneratePlanSummary({
  standing,
  graduation,
  campus,
  keepPlanned,
  released,
  pace,
  notes,
  onEdit,
}: {
  standing: PlanStanding
  graduation: string
  campus: string
  keepPlanned: string
  released: number
  pace: PaceState
  notes: string
  onEdit: (step: SettingStep) => void
}) {
  const { choices, rules } = planSettings({
    standing,
    graduation,
    campus,
    keepPlanned,
    released,
    pace,
    notes,
  })

  return (
    <>
      <div className="flex w-full flex-col gap-2">
        <h3 className="text-h400 font-semibold text-black">
          Here's what plans will be based on
        </h3>
        <p className="text-body-md text-gray-80">
          Change anything that doesn't look right, then generate.
        </p>
      </div>

      <div className="flex w-full flex-col gap-2 rounded-md border border-gray-40 bg-gray-0 p-[15px]">
        <h4 className="text-caption-md font-medium text-gray-100">Your choices</h4>
        <SettingsSection rows={choices} onEdit={onEdit} />
      </div>
      <AccountingFor rows={rules} onEdit={onEdit} />
    </>
  )
}
