import { cn } from "cn"
import { useState } from "react"

import { Icon } from "@/components/icon"
import { PanelTopHeader } from "@/components/stellic/panel-top-header"
import { StepBars, StepLabel } from "@/components/stellic/step-tracker"
import { keepChoices } from "@/components/stellic/generate-plan-pace"
import { GenerateTermBuilding } from "@/components/stellic/generate-term-building"
import {
  DAYS,
  GenerateSchedulePrefs,
  defaultPrefs,
  scoreSchedule,
  type SchedulePrefs,
} from "@/components/stellic/generate-schedule-prefs"
import {
  defaultSeatNote,
  GenerateTermNotes,
  type SeatNote,
} from "@/components/stellic/generate-term-notes"
import { AccountingFor, SettingsSection, type SettingRow } from "@/components/stellic/plan-settings"
import { KeepPicker } from "@/components/stellic/keep-picker"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { RadioCard } from "@/components/stellic/primitives"
import {
  CREDITS_PER_COURSE,
  INSTITUTION_INSTRUCTIONS,
  PLANNING_RULES,
  SCHEDULE_INSTITUTION_INSTRUCTIONS,
  clockTime,
  type PlanStanding,
  type Term,
} from "@/data/plan"

/* Generating one term rather than the whole plan. The question is narrower —
 * how full should this term be, and what in it is settled — so it fits in two
 * steps instead of three. */

type View = 1 | 2 | 3 | "summary" | "building"

/** What the slider can ask for. The floor is a half load; the ceiling is two
 *  terms' worth, for anyone who wants to see the plan push back. */
const MIN_CREDITS = 6
const MAX_CREDITS = 30

/** The load the institution calls full-time, which is where the slider starts
 *  and what the badge under it is pointing at. */
const RECOMMENDED = 15

/** A titled block in the panel, matching the wizard's spacing. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="animate-fade flex w-full flex-col gap-2">
      <div className="flex w-full items-center pb-2">
        <h3 className="flex-1 text-caption-lg font-semibold text-gray-100">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function Step({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex w-full flex-col gap-2">
      <h4 className="pb-2 text-body-md font-semibold text-gray-100">{title}</h4>
      {children}
    </section>
  )
}

/** The gray panel reading back what the answers add up to. */
function Preview({ kept, adding, empty }: { kept: number; adding: number; empty: boolean }) {
  return (
    <div className="flex w-full flex-col gap-2 rounded-md bg-gray-0 p-3">
      <p className="text-body-md font-semibold text-foreground">Here is what will be generated</p>
      {/* A term with nothing in it is not keeping anything, and saying so in
          credits reads as a failure rather than a blank page. */}
      {!empty && (
        <p className="flex items-center gap-2 text-body-md text-gray-100">
          <Icon name="lock" size={16} className="shrink-0" />
          Keeping {kept} credit{kept === 1 ? "" : "s"} already planned
        </p>
      )}
      <p className="flex items-center gap-2 text-body-md text-gray-100">
        <Icon name="add" size={16} className="shrink-0" />
        {adding > 0
          ? `Up to ${adding} credit${adding === 1 ? "" : "s"} will be added`
          : "Nothing to add at this target"}
      </p>
    </div>
  )
}

export function GenerateTermPanel({
  term,
  standing,
  mode,
  options,
  selectedOption,
  onSelectOption,
  compare,
  onCompareChange,
  onFraming,
  onGenerate,
  onApply,
  onClose,
}: {
  term: Term
  standing: PlanStanding
  /** A term whose schedule is out is generated into a timetable, and asks one
   *  more question to do it. */
  mode: "term" | "schedule"
  /** The drafts the run produced, once there are any. */
  options?: { id: string; label: string; blurb: string; added: number; term?: Term }[]
  selectedOption?: string
  onSelectOption?: (id: string) => void
  /** Whether the calendar is showing what the term already held alongside what
   *  the option proposes. */
  compare?: boolean
  onCompareChange?: (next: boolean) => void
  /** The run has reached its last check: frame the playground before the term
   *  arrives to fill it. */
  onFraming: () => void
  /** Fill this term to the target, keeping everything but the released, and
   *  filling each held seat with what the student said they wanted in it. */
  onGenerate: (
    targetCredits: number,
    released: string[],
    prefer: Record<string, string>
  ) => void
  /** Asks to apply the option on the canvas; absent until there is one. */
  onApply?: () => void
  onClose: () => void
}) {
  const [view, setView] = useState<View>(1)
  const showing = options != null && options.length > 0
  const scheduling = mode === "schedule"
  const title = scheduling ? "Generate Schedule" : "Generate Term"
  /* Scheduling asks about class times as well, which is a step of its own. */
  const totalSteps = scheduling ? 3 : 2
  const step = view === 3 ? 3 : view === 2 ? 2 : 1
  const [target, setTarget] = useState(RECOMMENDED)
  const [keepPlanned, setKeepPlanned] = useState("yes")
  const [released, setReleased] = useState<string[]>([])
  const [notes, setNotes] = useState("")
  const [seatNotes, setSeatNotes] = useState<Record<string, SeatNote>>({})
  const [prefs, setPrefs] = useState<SchedulePrefs>(() => defaultPrefs(term))

  const planned = term.courses.filter((c) => !released.includes(c.id))
  const kept = planned.reduce((n, c) => n + c.credits, 0)
  /* Only whole courses can be added, so the target rounds down to one. */
  const adding = Math.max(0, Math.floor((target - kept) / CREDITS_PER_COURSE)) * CREDITS_PER_COURSE
  const seats = planned.filter((c) => c.placeholder)
  /* Option ids best first, by how well each week answers the ranking. */
  const ranked = (options ?? [])
    .filter((o) => o.term)
    .map((o) => ({ id: o.id, total: scoreSchedule(o.term!, prefs).total }))
    .sort((a, b) => b.total - a.total)
    .map((o) => o.id)
  const isStep = !showing && (view === 1 || view === 2 || view === 3)

  /* What the summary reads back: the answers given, then the rules the school
     applies whatever anybody answers. */
  const choices: SettingRow[] = [
    { label: "Target credits", value: `${target} credits`, step: 1 },
    {
      label: "Keeping",
      value:
        term.courses.length === 0
          ? "Nothing planned yet"
          : keepPlanned === "yes"
            ? "Everything planned"
            : `${term.courses.length - released.length} of ${term.courses.length} courses`,
      step: 1,
    },
    { label: "Term instructions", value: notes || "None", step: 2 },
    ...(scheduling
      ? [
          {
            label: "Must haves",
            value: prefs.must.map((p) => `${p.title}: ${p.chosen.join(", ") || "Any"}`).join(" · "),
            step: 3 as const,
          },
          {
            label: "Nice to haves",
            value: prefs.nice.map((p, i) => `${i + 1}. ${p.title}`).join(" · "),
            step: 3 as const,
          },
        ]
      : []),
    ...(seats.length > 0
      ? [
          {
            label: "Elective instructions",
            value: seats
              .map((seat) => {
                const note = seatNotes[seat.id] ?? defaultSeatNote()
                const parts = [...note.filters, note.prefer].filter(Boolean)
                return `${seat.name}: ${parts.join(", ") || "No preferences"}`
              })
              .join(" · "),
            step: 2 as const,
          },
        ]
      : []),
  ]

  const rules: SettingRow[] = [
    { label: "Requirement priority", value: PLANNING_RULES.requirementPriority },
    { label: "Campus", value: term.campus ?? "Main campus" },
    {
      label: "Existing credit",
      value: `${standing.completed.reqs} courses, ${standing.completed.credits} credits`,
    },
    { label: "Prerequisites, co-reqs, anti-reqs", value: PLANNING_RULES.prerequisites },
    { label: "Term offerings", value: `through ${PLANNING_RULES.offeringsThrough}` },
    { label: "Credit load limits", value: `max ${PLANNING_RULES.maxCreditsPerTerm} per term` },
    {
      label: "Institution instructions",
      value: scheduling ? SCHEDULE_INSTITUTION_INSTRUCTIONS : INSTITUTION_INSTRUCTIONS,
    },
  ]

  return (
    <aside className="@container flex h-full w-full flex-col overflow-x-clip overflow-y-auto bg-card">
      <PanelTopHeader
        title={title}
        subline={isStep && <StepLabel step={step} total={totalSteps} />}
        below={isStep && <StepBars step={step} total={totalSteps} />}
        onClose={onClose}
      />


      {/* pb-28 keeps the footer clear of the assistant button, which is fixed
            over this corner of the screen and will otherwise take the click
            meant for Continue. */}
      <div className="flex flex-1 flex-col gap-8 p-6 pb-28">
        {showing && (
          <>
            <Section title={scheduling ? "Schedule instructions" : "Term instructions"}>
              <div className="flex w-full items-center gap-2 rounded-md border border-gray-40 bg-gray-0 p-[11px]">
                <span className="min-w-0 flex-1 truncate text-body-md text-gray-100">
                  {term.name} · {target} credits
                  {notes && ` · ${notes}`}
                </span>
                <Button size="sm" className="shrink-0" onClick={() => setView(1)}>
                  <Icon name="edit" size={16} />
                  Edit
                </Button>
              </div>
            </Section>

            {scheduling && (
              <label className="flex w-full cursor-pointer items-center justify-between gap-2">
                <span className="text-body-md font-semibold text-gray-100">
                  Compare with current schedule
                </span>
                <Switch checked={compare} onCheckedChange={(on) => onCompareChange?.(on)} />
              </label>
            )}

            <Section title={scheduling ? "Schedule options" : "Term options"}>
              <RadioGroup
                value={selectedOption}
                onValueChange={(next) => onSelectOption?.(next)}
                className="w-full gap-2"
              >
                {options!.map((option, index) => {
                  /* A schedule is judged on the week it comes out as, so its
                     card shows the week rather than only the reasoning. */
                  const week = scheduling && option.term ? scoreSchedule(option.term, prefs) : null
                  const rank = ranked.indexOf(option.id)

                  return (
                    <label
                      key={option.id}
                      className={cn(
                        "flex w-full cursor-pointer flex-col gap-2 rounded-md border p-[11px] transition-colors",
                        selectedOption === option.id ? "border-primary-50" : "border-gray-40"
                      )}
                    >
                      {/* The answer and its reasoning are separated by a rule,
                          the way the plan's options are: above it is what this
                          option is, below it is why. A card with nothing to say
                          for itself ends at the row instead. */}
                      <span
                        className={cn(
                          "flex w-full items-start gap-3",
                          option.blurb && "border-b border-gray-40 pb-4"
                        )}
                      >
                        <span className="flex shrink-0 items-center py-1">
                          <RadioGroupItem value={option.id} />
                        </span>

                        <span className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 pt-px">
                          <span className="flex w-full items-start justify-between gap-2">
                            <span className="flex items-start gap-2">
                              {/* Numbered, the way the plan's options are: what
                                  you point at on stage is "option two". */}
                              <span className="text-body-md font-semibold text-gray-100">
                                Option {index + 1}
                              </span>
                              {week && rank === 0 && (
                                <Badge className="bg-primary-50 font-semibold text-white">
                                  <Icon name="emoji-events" size={12} />
                                  Best Match
                                </Badge>
                              )}
                              {week && rank === 1 && (
                                <Badge className="bg-primary-0 font-semibold text-primary-50">
                                  <Icon name="star" size={12} />
                                  Strong Match
                                </Badge>
                              )}
                            </span>
                            <Badge variant="success">+{option.added}</Badge>
                          </span>

                          {week && (
                            <span className="flex w-full items-center gap-4 py-2">
                              <span className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                                <span className="flex items-center gap-1">
                                  {DAYS.map((day, i) => (
                                    <span
                                      key={day}
                                      className={cn(
                                        "flex w-5 items-center justify-center rounded-md px-2 py-0.5",
                                        "text-overline font-medium tracking-[0.5px] uppercase",
                                        week.days.includes(i + 1)
                                          ? "bg-gray-5 text-gray-100"
                                          : "bg-gray-0 text-gray-5"
                                      )}
                                    >
                                      {day[0]}
                                    </span>
                                  ))}
                                </span>
                                <span className="text-body-md text-gray-100">
                                  {week.earliest == null ? (
                                    "No classes timetabled"
                                  ) : (
                                    <>
                                      Earliest class: {clockTime(week.earliest)}
                                      <br />
                                      Latest class: {clockTime(week.latest!)}
                                    </>
                                  )}
                                </span>
                              </span>

                              {/* How far each nice to have was met, in the
                                  order they were ranked. */}
                              <span className="flex w-[125px] shrink-0 flex-col">
                                {prefs.nice.map((pref) => {
                                  const met = week.scores[pref.id as keyof typeof week.scores] ?? 0
                                  return (
                                    <span key={pref.id} className="flex items-center gap-[5px]">
                                      <span className="flex h-2 w-6 items-center">
                                        {[0, 1, 2].map((dot) => (
                                          <span
                                            key={dot}
                                            className="flex w-2 justify-center"
                                          >
                                            <span
                                              className={cn(
                                                "size-1.5 rounded-full",
                                                dot < met
                                                  ? "bg-gray-100"
                                                  : "border border-gray-40"
                                              )}
                                            />
                                          </span>
                                        ))}
                                      </span>
                                      <span className="text-overline font-medium tracking-[0.5px] text-gray-80 uppercase">
                                        {pref.title}
                                      </span>
                                    </span>
                                  )
                                })}
                              </span>
                            </span>
                          )}
                        </span>
                      </span>

                      {option.blurb && (
                        <span className="text-label-md text-gray-100">{option.blurb}</span>
                      )}
                    </label>
                  )
                })}
              </RadioGroup>
            </Section>

            {/* The end of the panel is the end of the decision, as it is for
                the plan: read the options, pick one, apply it. Held at the foot of
                the panel, so it is never lost off the bottom. */}
            {onApply && (
              <div className="sticky bottom-0 z-10 -mx-6 -mb-28 border-t border-gray-40 bg-card px-6 pt-3 pb-4">
                <Button variant="primary" className="animate-fade w-full" onClick={onApply}>
                  Apply plan
                </Button>
              </div>
            )}
          </>
        )}

        {!showing && view === 1 && (
          <div className="flex w-full flex-col gap-2">
            <h3 className="text-h400 font-semibold text-foreground">Let's plan {term.name}</h3>
            <p className="text-body-md text-gray-80">
              Set a credit target and tell us what to keep. We'll build the rest around it.
            </p>
          </div>
        )}

        {showing ? null : view === 1 ? (
          <>
            <section className="flex w-full flex-col items-center gap-2">
              <div className="flex w-full items-start">
                <p className="min-w-0 flex-1 pb-2 text-body-md font-semibold text-gray-100">
                  Target credits
                </p>
              </div>
              <div className="flex w-full items-start gap-2 text-body-md text-gray-80">
                <span className="min-w-0 flex-1">{MIN_CREDITS} credits</span>
                <span className="min-w-0 flex-1 text-right">{MAX_CREDITS} credits</span>
              </div>
              <Slider
                value={[target]}
                min={MIN_CREDITS}
                max={MAX_CREDITS}
                step={CREDITS_PER_COURSE}
                onValueChange={([next]) => setTarget(next)}
                aria-label="Target credits"
              />
              <div className="flex flex-col items-center gap-2">
                <p className="text-body-md text-gray-100">{target} credits</p>
                {target === RECOMMENDED && (
                  <Badge className="bg-primary-0 text-primary-50">Recommended</Badge>
                )}
              </div>
            </section>

            {term.courses.length > 0 && (
              <Step title="Keep everything already planned?">
                <RadioGroup
                  value={keepPlanned}
                  onValueChange={(next) => {
                    setKeepPlanned(next)
                    if (next === "yes") setReleased([])
                  }}
                  className="w-full gap-2"
                >
                  {keepChoices(term.courses.length).map((choice) => (
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
                  <KeepPicker terms={[term]} released={released} onChange={setReleased} />
                )}
              </Step>
            )}

            <Preview kept={kept} adding={adding} empty={term.courses.length === 0} />
          </>
        ) : view === 2 ? (
          <GenerateTermNotes
            seats={seats}
            notes={notes}
            onNotesChange={setNotes}
            seatNotes={seatNotes}
            onSeatNoteChange={(id, next) => setSeatNotes((all) => ({ ...all, [id]: next }))}
          />
        ) : view === 3 ? (
          <GenerateSchedulePrefs term={term} prefs={prefs} onChange={setPrefs} />
        ) : view === "summary" ? (
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
              <SettingsSection
                rows={choices}
                onEdit={(edit) => setView(edit === 3 ? 3 : edit === 2 ? 2 : 1)}
              />
            </div>
            <AccountingFor rows={rules} />
          </>
        ) : (
          <GenerateTermBuilding
            term={term}
            standing={standing}
            mode={mode}
            onLastStep={onFraming}
            onDone={() => {
              /* Step back off the build before handing over. The draft is what
                 the panel shows from here; leaving the view on "building"
                 means that if the draft ever goes away — applied, or thrown
                 out — this would mount again and run a second time. */
              setView(1)
              /* Every seat in the term, whether or not the student touched the
                 box: one that was left alone still carries what it opened
                 with, and the run should read what was on screen. */
              onGenerate(
                target,
                released,
                Object.fromEntries(
                  seats.map((seat) => [seat.id, (seatNotes[seat.id] ?? defaultSeatNote()).prefer])
                )
              )
            }}
          />
        )}

        {/* In flow under the preview, as the design has it — and out from
            under the assistant button, which is fixed to the bottom right. */}
        {!showing && view !== "building" && (
          <div className="flex w-full items-center gap-2">
            <Button
              className="flex-1"
              onClick={() =>
                view === 1
                  ? onClose()
                  : view === "summary"
                    ? setView(scheduling ? 3 : 2)
                    : setView(view === 3 ? 2 : 1)
              }
            >
              {view === "summary" ? "Start over" : "Back"}
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={() =>
                setView(
                  view === 1
                    ? 2
                    : view === 2
                      ? scheduling
                        ? 3
                        : "summary"
                      : view === 3
                        ? "summary"
                        : "building"
                )
              }
            >
              {view === "summary" ? title : "Continue"}
            </Button>
          </div>
        )}
      </div>
    </aside>
  )
}
