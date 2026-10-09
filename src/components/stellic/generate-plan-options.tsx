import { cn } from "cn"
import type { ReactNode } from "react"

import { Icon } from "@/components/icon"
import { GeneratePlanEdit } from "@/components/stellic/generate-plan-edit"
import type { SettingRow, SettingStep } from "@/components/stellic/plan-settings"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

/* What the panel shows once a draft exists: the instructions it was built from,
 * and the options it came up with. Picking one redraws the canvas. */

export type PlanOptionSummary = {
  id: string
  label: string
  blurb: string
  /** The blurb as bullets, where the option has them. */
  points?: string[]
  graduation: string
  added: number
  removed: number
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="animate-fade flex w-full flex-col gap-2">
      <div className="flex w-full items-center pb-2">
        <h3 className="flex-1 text-caption-lg font-semibold text-gray-100">{title}</h3>
      </div>
      {children}
    </div>
  )
}

export function GeneratePlanOptions({
  instructions,
  settings,
  editing,
  options,
  selected,
  onSelect,
  onEdit,
  onCancelEdit,
  onEditStep,
  onStartOver,
  onRegenerate,
  canRegenerate,
  onApply,
}: {
  /** One line reading back what the draft was built from. */
  instructions: string
  /** The same line spelled out, for when the card is opened up. */
  settings: { choices: SettingRow[]; rules: SettingRow[] }
  editing: boolean
  options: PlanOptionSummary[]
  selected: string
  onSelect: (id: string) => void
  onEdit: () => void
  onCancelEdit: () => void
  onEditStep: (step: SettingStep) => void
  onStartOver: () => void
  onRegenerate: () => void
  canRegenerate: boolean
  /** Applies the chosen option. Absent while the settings are open, where
   *  the answer to give is Regenerate rather than Apply. */
  onApply?: () => void
}) {
  return (
    <>
      <Section title="Plan instructions">
        {editing ? (
          <GeneratePlanEdit
            choices={settings.choices}
            rules={settings.rules}
            onCancel={onCancelEdit}
            onEditStep={onEditStep}
            onStartOver={onStartOver}
            onRegenerate={onRegenerate}
            canRegenerate={canRegenerate}
          />
        ) : (
          <div className="flex w-full items-center justify-between gap-2 rounded-md border border-gray-40 bg-gray-0 p-[15px]">
            <p className="min-w-0 flex-1 text-body-md text-gray-100">{instructions}</p>
            <Button onClick={onEdit}>
              <Icon name="edit" size={16} />
              Edit
            </Button>
          </div>
        )}
      </Section>

      <Section title="Plan options">
        <RadioGroup value={selected} onValueChange={onSelect} className="w-full gap-2">
          {options.map((option, index) => {
            const active = option.id === selected
            return (
              <div
                key={option.id}
                className={cn(
                  "flex w-full flex-col gap-2 rounded-md border p-[11px] transition-colors",
                  active ? "border-primary-50" : "border-gray-40"
                )}
              >
                {/* The rule divides the option from its description, so the
                    card that has none ends at the row. */}
                <label
                  className={cn(
                    "flex w-full cursor-pointer items-start gap-3",
                    option.blurb && "border-b border-gray-40 pb-4"
                  )}
                >
                  <span className="flex items-center py-0.5">
                    <RadioGroupItem value={option.id} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 pt-px text-body-md">
                    {/* The generated three are numbered; the one collecting your
                        own changes goes by its name. */}
                    <span className="font-semibold text-foreground">
                      {option.blurb ? `Option ${index + 1}` : option.label}
                    </span>
                    <span className="text-gray-80">Expected Graduation {option.graduation}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    <Badge variant="success">+{option.added}</Badge>
                    {option.removed > 0 && <Badge variant="danger">-{option.removed}</Badge>}
                  </span>
                </label>
                {option.blurb &&
                  (option.points ? (
                    /* The strategy names the option rather than replacing its
                       number, so "Option 2" stays the thing you refer to; what
                       it does follows point by point. */
                    <div className="flex w-full flex-col gap-1 text-label-md text-gray-100">
                      <p className="font-semibold">{option.label}</p>
                      <ul className="flex list-disc flex-col gap-1 pl-5">
                        {option.points.map((point) => (
                          <li key={point}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="w-full text-label-md text-gray-100">
                      {option.label}: {option.blurb}
                    </p>
                  ))}
              </div>
            )
          })}
        </RadioGroup>
      </Section>

      {/* The end of the panel is the end of the decision: read the options,
          pick one, apply it. */}
      {onApply && (
        <Button variant="primary" className="animate-fade w-full" onClick={onApply}>
          Apply plan
        </Button>
      )}
    </>
  )
}
