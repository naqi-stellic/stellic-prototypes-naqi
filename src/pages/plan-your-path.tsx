import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { useEffect, useState } from "react"
import { cn } from "cn"

import { Icon } from "@/components/icon"
import { AppShell } from "@/components/layout/app-shell"
import { ApplyPlanDialog, DraftBar, DraftOutline } from "@/components/stellic/draft-frame"
import { MetadataProvider } from "@/components/stellic/course-metadata"
import { GenerateTermPanel } from "@/components/stellic/generate-term-panel"
import { IncomingCredits, INCOMING_LABEL } from "@/components/stellic/incoming-credits"
import type { IncomingGroup } from "@/data/incoming"
import { CoursePanel } from "@/components/stellic/course-panel"
import type { Instance } from "@/data/course-sidebar"
import { CourseSearchPanel } from "@/components/stellic/course-search"
import { PlaceholderPanel } from "@/components/stellic/placeholder-panel"
import { DiscardDraftDialog } from "@/components/stellic/discard-draft-dialog"
import { RegisterDialog } from "@/components/stellic/register-dialog"
import {
  NARROWING_DEFAULT,
  RequirementRow,
  RequirementsPanel,
  requirementIndex,
  type Narrowing,
} from "@/components/stellic/requirements-panel"
import { ReviewDialog } from "@/components/stellic/review-dialog"
import { ReviewPanel } from "@/components/stellic/review-panel"
import { PlanIssuesProvider, useRegistrable } from "@/components/stellic/plan-issues"
import { PendingReviewProvider } from "@/components/stellic/review-state"
import {
  ADD_REMAINING,
  cameFrom,
  PlanHeader,
  reviewAction,
  type PlanAction,
  type TabTerm,
  type YearTab,
} from "@/components/stellic/plan-header"
import { GeneratePlanPanel } from "@/components/stellic/generate-plan-panel"
import { TermView } from "@/pages/term-view"
import {
  AuditRow,
  NoActionsAlert,
  STREAM_CAP,
  STREAM_MS,
  YearSection,
} from "@/components/stellic/planner"
import { AddSlot } from "@/components/stellic/primitives"
import {
  Alert,
  AlertBody,
  AlertDescription,
  AlertHeader,
  AlertTitle,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  ALL_ELECTIVES,
  REMAINING_REQUIREMENTS,
  type CatalogEntry,
} from "@/data/catalog"
import { INCOMING_CREDITS, incomingTotals } from "@/data/incoming"
import type { Preview } from "@/components/stellic/term-calendar"
import {
  changesSince,
  INITIAL_REVIEWS,
  planSignature,
  requestedLine,
  type Review,
} from "@/data/review"
import { releasableTerms } from "@/components/stellic/keep-picker"
import {
  TERM_OPTIONS,
  acceptDraft,
  generateTermDraft,
  addCourse,
  emptySeat,
  fillSeat,
  addableCourses,
  draftLength,
  draftTally,
  generateDraft,
  moveInDraft,
  planOptions,
  removeInDraft,
  summariseDraft,
  unplacedRequirements,
  type Draft,
  type DraftOption,
} from "@/data/draft"
import {
  addTerm,
  addYear,
  INITIAL_YEARS,
  METADATA_DEFAULT,
  METADATA_FIELDS,
  expectedGraduation,
  findCourse,
  findTerm,
  moveCourse,
  nextYearNumber,
  planCampuses,
  planStanding,
  setSection,
  registerCourses,
  registrationBanner,
  removeCourse,
  selectableTerms,
  type MetadataField,
  type Meeting,
  type Term,
  type Year,
} from "@/data/plan"

const PHASE_TAB = {
  complete: { icon: "check-circle", tone: "text-success-100" },
  active: { icon: "timelapse", tone: "text-warning-50" },
  future: {},
} as const

/* A term carries its own state in the menu, which is not always its year's: a
   year under way holds a term in progress and a term still ahead. */
function termTab(term: Term): TabTerm {
  const done = term.state === "completed"
  return {
    id: term.id,
    /* "Fall 27" rather than "Fall 2027" — the year is the thing it hangs off. */
    label: term.name.replace(/(\d{2})(\d{2})$/, "$2"),
    icon: done ? "check-circle" : term.locked ? "timelapse" : "arrow-circle-right",
    tone: done ? "text-success-100" : term.locked ? "text-warning-50" : "text-gray-60",
  }
}

/* One tab per year the plan actually covers, completed year included, so the
   filter can never omit a year that is on screen. `openYear` is the year of a
   term being looked at on its own, which is what the filter then reads as. */
function yearTabs(
  years: Year[],
  openYear: string | undefined,
  onLeave: () => void,
  onOpenTerm: (termId: string) => void
): YearTab[] {
  return [
    { label: "All Years", icon: "grid-view", selected: !openYear, onSelect: onLeave },
    ...years.map((year) => ({
      label: year.label,
      ...PHASE_TAB[year.phase],
      selected: year.label === openYear,
      terms: year.terms.map(termTab),
      onSelectTerm: onOpenTerm,
    })),
  ]
}

/** The year a term belongs to, for the filter above it. */
function yearOf(years: Year[], termId: string): string | undefined {
  return years.find((year) => year.terms.some((t) => t.id === termId))?.label
}

/* Long enough for the last staggered card to finish settling (14 × 35ms of
   stagger plus a 420ms vanish), then the frame follows it out. */
const SETTLE_MS = 1100

/** The option that collects the student's own changes. */
const CUSTOM_ID = "custom"



/** The plan's actions in the order the work goes: decide what the cards show,
 *  fill the plan — for you, or by hand — and have it looked at. Plan details
 *  gets its menu built per render, since it has to show which details are
 *  currently on. */
function planActions(
  metadata: MetadataField[],
  generators: boolean,
  requested: boolean
): PlanAction[] {
  return [
    {
      label: "Plan details",
      icon: "remove-red-eye",
      fields: METADATA_FIELDS.map((field) => ({
        ...field,
        shown: metadata.includes(field.id),
      })),
    },
    ...(generators
      ? [{ label: "Generate plan", icon: "design-services" as const, toggles: true }]
      : []),
    ADD_REMAINING,
    reviewAction(requested),
  ]
}

function RegistrationAlert({ term, onRegister }: { term: Term; onRegister?: () => void }) {
  const banner = registrationBanner(term, useRegistrable(term).length)
  const done = banner.state === "registered"

  /* 92px is the design's height for a banner with a button under its line; a
     minimum rather than a fixed value so it can grow when the closing date
     wraps. With nothing under the line, it is one line and sized like one. */
  const tall = banner.register != null || banner.note != null
  return (
    <Alert variant={done ? "success" : "info"} className={cn(tall && "min-h-[92px]")}>
      <AlertBody>
        <AlertHeader>
          <AlertTitle>
            <Icon
              name={done ? "check-circle" : "event-available"}
              size={16}
              className={cn("mt-0.5 shrink-0", done ? "text-success-100" : "text-primary-100")}
            />
            {banner.title}
          </AlertTitle>
          {/* The date stays on one line while there is room for it; in a term
              sharing its row with two others there is not. */}
          <AlertDescription className="@max-[400px]/term:whitespace-normal">
            {banner.closesLabel}: {term.alert?.closes}
          </AlertDescription>
        </AlertHeader>
        {banner.note && <p className="text-body-md text-gray-80">{banner.note}</p>}
        {/* There or not there: a button offering to register nothing is not
            an offer, so it goes rather than greying out. */}
        {banner.register != null && (
          <Button variant="primary" size="sm" onClick={onRegister}>
            Register {banner.register} course{banner.register === 1 ? "" : "s"}
          </Button>
        )}
      </AlertBody>
    </Alert>
  )
}

/** A term's banner: the registration deadline when it has one, and — while a
 *  draft is on the canvas — the reassurance that it needs nothing otherwise. */
function termBanner(term: Term, drafting: boolean, onRegister: (term: Term) => void) {
  if (term.alert) return <RegistrationAlert term={term} onRegister={() => onRegister(term)} />
  return drafting && !term.locked ? <NoActionsAlert /> : null
}

/** Where a course panel's way back leads, where it is another course. */
type OpenBack = { planned: string } | { entry: CatalogEntry; from: string }

export function PlanYourPath({
  generators = true,
  initialYears = INITIAL_YEARS,
  incoming,
}: {
  /* Whether this prototype offers to generate: the plan, a term, a schedule.
     Without them the planner is the same in every other way — the same cards,
     the same term views, the same registration and review. */
  generators?: boolean
  /** What the plan holds when it opens. */
  initialYears?: Year[]
  /** The credit the student arrived with, where it is not the default set. */
  incoming?: IncomingGroup[]
} = {}) {
  /* Whether somebody arrived here from a student's record. Read once: it
     decides the nav as well as the way back on the breadcrumb. */
  const opened = cameFrom()

  const [years, setYears] = useState(initialYears)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  /* Where the course under the cursor would land if it were let go. Only set
   * while it is crossing into another term: sorting within one already opens
   * its own gap. */
  const [drop, setDrop] = useState<{ termId: string; index: number; height: number } | null>(null)
  const [generateOpen, setGenerateOpen] = useState(false)

  /* One draft per option, generated together so the panel can show what each
   * one costs before the student commits to looking at it. */
  const [drafts, setDrafts] = useState<{ options: DraftOption[]; made: Draft[] } | null>(null)
  /* Everything the student changes by hand collects in one option of its own,
   * so the generated three stay as they were generated. */
  const [custom, setCustom] = useState<{ option: DraftOption; draft: Draft } | null>(null)
  const [optionId, setOptionId] = useState("steady")
  /* Accepting is not instant: the marks come off and the struck cards leave
   * before the plan underneath becomes the real one. */
  const [accepting, setAccepting] = useState(false)
  /* The playground frames itself while the run is on its last step, so the plan
   * arrives into something rather than appearing with it. */
  const [framing, setFraming] = useState(false)
  /* A term opened on its own. The planner stays mounted behind it, so coming
   * back does not cost the plan its scroll position or its draft. */
  const [openTermId, setOpenTermId] = useState<string | null>(null)
  /* Which view the open term was asked to open on, where it was asked. */
  const [openTermOn, setOpenTermOn] = useState<"calendar" | undefined>(undefined)
  /* What is finished comes folded away; the rest come open. */
  /* What the plan opens folded: the credit brought in, and any year already
     finished. Both are a record rather than a plan — there is nothing left to
     do to them — so they state what they came to and keep it behind the
     chevron until somebody asks. */
  const [collapsed, setCollapsed] = useState<string[]>(() => [
    INCOMING_LABEL,
    ...initialYears.filter((year) => year.phase === "complete").map((year) => year.label),
  ])
  /* Which details the cards are showing. Plan details owns this, and every
     card in the plan — canvas or term — answers to the same list. */
  const [metadata, setMetadata] = useState<MetadataField[]>(METADATA_DEFAULT)
  /* What leaving a generated plan would do, held while the student is asked
     whether to throw the plan away. */
  const [leaving, setLeaving] = useState<(() => void) | null>(null)
  /* Whether "Apply this plan?" is up. */
  const [applying, setApplying] = useState(false)
  /* The term whose registration dialog is up, if any. */
  const [registering, setRegistering] = useState<Term | null>(null)
  /* The term whose Generate Term panel is open, if any. */
  const [generatingTerm, setGeneratingTerm] = useState<string | null>(null)
  /* Reviews asked for on this plan, newest first. */
  const [reviews, setReviews] = useState<Review[]>(INITIAL_REVIEWS)
  /* The review dialog, and which term it was opened from — none means the
     whole plan, which is the only case that gets to choose terms. */
  const [requesting, setRequesting] = useState<{ term: Term | null } | null>(null)
  /* Whether the reviews panel is showing beside the plan. */
  const [reviewPanel, setReviewPanel] = useState(false)
  /* Whether what the degree still wants is showing beside the plan, to be
     dragged into it. */
  const [reqsOpen, setReqsOpen] = useState(false)
  /* How the remaining list is narrowed, kept here rather than in the panel:
     opening one of those courses closes the panel, and coming back should
     find the list as it was left. */
  const [narrowing, setNarrowing] = useState<Narrowing>(NARROWING_DEFAULT)
  /* A course from the remaining list, opened on its own before it is anywhere
     in the plan. */
  const [openCourse, setOpenCourse] = useState<{
    entry: CatalogEntry
    /** Its place in the outstanding list, where it came from there. */
    requirement?: number
    /** What the way back says, which depends on where it was opened from. */
    from: string
    /** Where the way back goes, where it is another course rather than a list:
     *  a prerequisite tree can be walked, so it can be walked back. */
    back?: OpenBack
  } | null>(null)
  /* A course already in the plan, opened on its own. */
  const [openPlanned, setOpenPlanned] = useState<string | null>(null)
  /* The course search, opened from a term's own "+ Add to Term". */
  const [searching, setSearching] = useState<string | null>(null)
  /* The held seat opened on its own, and whether it opened on the courses that
     could fill it. */
  const [openSeat, setOpenSeat] = useState<{ id: string; view: "detail" | "search" } | null>(null)
  /* Whether a generated schedule is shown against what the term already held,
     or on its own. */
  const [compare, setCompare] = useState(true)
  /* Bumped when a plan arrives on a canvas that had none — generating, or
   * generating again. Swapping between the options it produced, or changing one
   * by hand, is not an arrival: the plan is already there and only its contents
   * differ, so those leave this alone and nothing re-animates. */
  const [streamId, setStreamId] = useState(0)
  /* How much of the landing draft has arrived. Infinity once it all has, which
   * is also the resting state for a draft that is just sitting there. */
  const [revealed, setRevealed] = useState(Infinity)

  const draft =
    (optionId === CUSTOM_ID ? custom?.draft : drafts?.made.find((d) => d.optionId === optionId)) ??
    null
  const option =
    (optionId === CUSTOM_ID ? custom?.option : drafts?.options.find((o) => o.id === optionId)) ??
    null
  /* The draft is a proposal laid over the plan; the plan itself is untouched
   * underneath until it is accepted. */
  const shown = draft ? draft.years : years

  const sensors = useSensors(
    /* A few pixels of travel before a drag starts, so rows stay clickable. */
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const dragging = draggingId ? findCourse(shown, draggingId) : null
  /* Offered by every term's "+ Add to Term", so the same requirement is never
   * offered twice over. */
  const addable = addableCourses(shown)
  /* What the degree still wants — the requirements with no term yet, each
     knowing its place in that list. Not the same as what "+ Add to Term"
     offers: that ends with a spare seat, which is a way to hold a place rather
     than a requirement outstanding. */
  const requirements = unplacedRequirements(shown)
  /* The requirement being dragged out of the panel, if that is what this is. */
  const draggingEntry = requirements.find(
    (r) => draggingId != null && r.index === requirementIndex(draggingId)
  )?.entry
  /* What the bar says while a draft is arriving. */
  const landedTally = draft ? draftTally(draft.years, revealed) : { added: 0, removed: 0 }
  /* Terms the draft has something to say about, for the confirmation. */
  const touchedTerms = draft
    ? draft.years.reduce(
        (n, year) => n + year.terms.filter((t) => t.courses.some((c) => c.draft)).length,
        0
      )
    : 0
  /* The plan against the degree, with the credit the student arrived with
     counted as the credit it is. */
  const standing = planStanding(years, incomingTotals(incoming))
  /* The course opened on its own, from the remaining list or from the courses
     that could fill a seat. */
  const course = openCourse
  /* Or one already planned, which brings its term with it. */
  const plannedOpen = openPlanned ? findCourse(shown, openPlanned) : null
  /* The class the cursor is over in the course panel. It belongs to the page
     rather than to either side: the panel knows which class, the week knows
     how to draw it, and neither is inside the other. */
  const [preview, setPreview] = useState<Preview | null>(null)
  /* Where a course opened like that could be put: every term that takes one. */
  const plannableTerms = shown.flatMap((year) => year.terms.filter((term) => !term.locked))
  /* The whole plan, which is what a course panel reads to say where a course
     fits: the year tabs narrow what is on the canvas, not what is true. */
  const allTerms = shown.flatMap((year) => year.terms)
  /* What the nav lists under Schedule: the terms that have one. A term nobody
     has scheduled yet has nothing to open, and joins the list the moment its
     classes come out. */
  const scheduleTerms = allTerms
    .filter((term) => term.scheduled)
    .map((term) => ({ name: term.name, inProgress: term.state === "registered" }))
  /* The term whose course search is open. */
  const searchTerm = searching ? findTerm(shown, searching) : null
  /* The seat whose panel is open, if it is still in the plan. */
  const seat = openSeat ? findCourse(shown, openSeat.id) : null
  /* Terms a request is still out on. Every card that draws one of them marks
     itself, whether it is on the canvas or opened on its own. */
  const pendingTerms = reviews.filter((r) => r.status === "pending").flatMap((r) => r.terms)
  const pending = reviews.find((r) => r.status === "pending")
  /* A request is out on the plan exactly as it stands. Any change and there
     is something new to ask about. */
  const requested = pending != null && changesSince(pending.at, years) === 0

  const optionSummaries = [
    ...(drafts?.made ?? []).map((d) => ({
      meta: drafts!.options.find((o) => o.id === d.optionId)!,
      draft: d,
    })),
    ...(custom ? [{ meta: custom.option, draft: custom.draft }] : []),
  ].map(({ meta, draft: d }) => ({
    id: meta.id,
    label: meta.label,
    blurb: meta.blurb,
    points: meta.points,
    graduation: d.graduation,
    added: d.added,
    removed: d.removed,
  }))

  const placeholders = draft
    ? draft.years.reduce(
        (sum, year) =>
          sum +
          year.terms.reduce(
            (n, term) => n + term.courses.filter((c) => c.placeholder && c.draft).length,
            0
          ),
        0
      )
    : 0

  /* The options are built around the pace the student asked for, so the answer
   * from step 2 decides what the three of them look like. */
  /* The cards land on CSS delays; this walks the same interval so the tallies
   * climb with them rather than standing at the total from the first frame. */
  const landing = draft?.years
  useEffect(() => {
    if (!landing) return
    const last = Math.min(draftLength(landing), STREAM_CAP)
    setRevealed(0)
    let at = 0
    const tick = window.setInterval(() => {
      at += 1
      setRevealed(at > last ? Infinity : at)
      if (at > last) window.clearInterval(tick)
    }, STREAM_MS)
    return () => window.clearInterval(tick)
    /* Keyed on the arrival, not on the draft: editing one by hand must not set
       the whole plan landing again. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamId])

  function startDraft(coursesPerTerm: number, released: string[]) {
    setFraming(false)
    setStreamId((n) => n + 1)
    const options = planOptions(coursesPerTerm)
    setDrafts({ options, made: options.map((o) => generateDraft(years, o, released)) })
    setCustom(null)
    setOptionId(options[0].id)
  }

  function dropDraft() {
    setFraming(false)
    setRevealed(Infinity)
    setDrafts(null)
    setCustom(null)
  }

  /* A change made by hand forks whichever option is on screen into the custom
   * one, which then becomes the selected plan. */
  function editDraft(change: (years: Year[]) => Year[]) {
    if (!draft || !option || accepting) return
    const next = change(draft.years)
    if (next === draft.years) return

    setCustom({
      option:
        option.id === CUSTOM_ID
          ? option
          : /* No blurb: the card names itself rather than describing a strategy
               it is no longer following. */
            { ...option, id: CUSTOM_ID, label: "Custom Plan", blurb: "" },
      draft: summariseDraft(next, CUSTOM_ID),
    })
    setOptionId(CUSTOM_ID)
  }

  function keepDraft() {
    if (!draft || accepting) return
    setAccepting(true)
    window.setTimeout(() => {
      setYears(acceptDraft(draft.years))
      setAccepting(false)
      dropDraft()
      setGenerateOpen(false)
      /* Applying is the end of a Generate Term run as much as of a plan one,
         so its panel goes with the draft rather than being left open over a
         term that has already taken the changes. */
      setGeneratingTerm(null)
    }, SETTLE_MS)
  }

  function handleDragStart(event: DragStartEvent) {
    setDraggingId(String(event.active.id))
  }

  /** Reads the drop target the same way the drop itself will: over a course
   *  means that course's place, over a card means the end of its list. A
   *  requirement coming from the panel is not in the plan yet, so it has no
   *  place to leave and is always added at the end. */
  function handleDragOver({ active, over }: DragOverEvent) {
    const activeId = String(active.id)
    const requirement = requirementIndex(activeId) != null
    const from = !requirement && over ? findCourse(shown, activeId) : null
    const overCourse = over ? findCourse(shown, String(over.id)) : null
    const termId = overCourse ? overCourse.term.id : String(over?.id)
    const term = over ? findTerm(shown, termId) : null

    if (!term || term.locked || (!requirement && (!from || term.id === from.term.id))) {
      setDrop((current) => (current === null ? current : null))
      return
    }

    /* The cursor sitting in the gap the slot opened resolves to the term
     * rather than to a course. Holding the place it already found keeps the
     * slot from bouncing to the end of the list and back. */
    const held = !overCourse && drop?.termId === termId
    const index = requirement
      ? term.courses.length
      : held
        ? drop.index
        : overCourse
          ? overCourse.index
          : term.courses.length
    const height = active.rect.current.translated?.height ?? 64
    setDrop((current) =>
      current && current.termId === termId && current.index === index && current.height === height
        ? current
        : { termId, index, height }
    )
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setDraggingId(null)
    setDrop(null)
    if (!over) return

    const courseId = String(active.id)
    /* A requirement dragged out of the panel is not being moved but placed:
       the term it was let go over is the term it is now to be taken in. */
    const index = requirementIndex(courseId)
    if (index != null) {
      const entry = requirements.find((r) => r.index === index)?.entry
      const landed = findCourse(shown, String(over.id))
      const termId = landed ? landed.term.id : String(over.id)
      const term = findTerm(shown, termId)
      if (entry && term && !term.locked) handleAddCourse(termId, entry, index)
      return
    }

    /* Dropping onto a row inserts at its position; onto a card, appends. */
    const overCourse = findCourse(shown, String(over.id))
    const toTerm = overCourse ? overCourse.term.id : String(over.id)
    const toIndex = overCourse ? overCourse.index : undefined

    if (draft) editDraft((current) => moveInDraft(current, courseId, toTerm, toIndex))
    else setYears((current) => moveCourse(current, courseId, toTerm, toIndex))
  }

  function handleRemoveCourse(courseId: string) {
    if (draft) editDraft((current) => removeInDraft(current, courseId))
    else setYears((current) => removeCourse(current, courseId))
  }

  /* And the other way: the course goes and the seat stands again. */
  function handleEmptySeat(courseId: string) {
    if (draft) editDraft((current) => emptySeat(current, courseId))
    else setYears((current) => emptySeat(current, courseId))
  }

  /* A seat becoming the course chosen for it, which is a change to the seat
     rather than something new arriving. */
  function handleFillSeat(courseId: string, entry: CatalogEntry) {
    if (draft) editDraft((current) => fillSeat(current, courseId, entry))
    else setYears((current) => fillSeat(current, courseId, entry))
  }

  function handleAddCourse(termId: string, entry: CatalogEntry, requirement?: number) {
    if (draft) editDraft((current) => addCourse(current, termId, entry, true, requirement))
    else setYears((current) => addCourse(current, termId, entry, false, requirement))
  }

  const openTerm: Term | null = openTermId
    ? findTerm(shown, openTermId)
    : null

  /* A term opens inside whatever is on screen: if a draft is up, the frame,
   * the bar and the options stay where they are and the term shows the draft's
   * version of itself. */
  function openTermView(termId: string) {
    setOpenTermOn(undefined)
    setOpenTermId(termId)
  }

  /* The summer a year can take. Nothing else can be added to one, so this is
     all "Add Summer" does. */
  function addYearTerm(yearLabel: string) {
    setYears((current) => addTerm(current, yearLabel))
  }

  /* "Search sections" on a term's line opens the course on its sections,
     where the student chooses one with its +. Nothing is chosen for them. */
  function pickSection(_termId: string, courseId: string) {
    openPlannedPanel(courseId)
  }

  function startTermDraft(
    targetCredits: number,
    released: string[],
    prefer: Record<string, string> = {}
  ) {
    if (!generatingTerm) return
    /* Three ways to fill the same term, the way the plan generator offers
       three ways to fill the whole degree. */
    const term = findTerm(years, generatingTerm)
    const made = TERM_OPTIONS.map((option) =>
      generateTermDraft(
        years,
        generatingTerm,
        targetCredits,
        released,
        option.id,
        term?.scheduled === true,
        prefer
      )
    )
    setDrafts({ options: TERM_OPTIONS, made })
    setOptionId(TERM_OPTIONS[0].id)
    setStreamId((n) => n + 1)
    setRevealed(0)
  }

  function register(termId: string, courseIds: string[]) {
    setYears((current) => registerCourses(current, termId, courseIds))
  }

  function submitReview(review: Review) {
    setReviews((current) => [{ ...review, at: planSignature(years) }, ...current])
    setRequesting(null)
    /* The request is the whole of what just happened, so the panel that
       accounts for it opens with it. */
    setReviewPanel(true)
    setReqsOpen(false)
    setGenerateOpen(false)
    setGeneratingTerm(null)
  }

  /* A generator keeps the space beside the plan ahead of every other panel,
     so anything else opening there has to move it aside or open unseen. Only
     the panel goes: a draft it made stays on the canvas, the same as when
     Generate plan is pressed off. */
  function closeGenerators() {
    setGenerateOpen(false)
    setGeneratingTerm(null)
  }

  /* Exiting a generated plan, or closing the generator that made it, throws
     the plan away — so where there is one, or one arriving, it asks first. */
  function confirmLeave(leave: () => void) {
    if (drafts || framing) setLeaving(() => leave)
    else leave()
  }

  /* One panel at a time: they answer different questions and the space beside
     the plan only holds one of them. */
  function openRequirements() {
    setReqsOpen((open) => !open)
    setReviewPanel(false)
    setOpenSeat(null)
    setOpenCourse(null)
    /* A course or a search would keep the space and leave this button
       pressed over a panel nobody can see. */
    if (!reqsOpen) {
      closeGenerators()
      setOpenPlanned(null)
      setSearching(null)
    }
  }

  /* The request already out, opened beside the plan rather than made again. */
  function openReviewPanel() {
    closeGenerators()
    setReviewPanel(true)
    setReqsOpen(false)
    setOpenSeat(null)
    setOpenPlanned(null)
    setOpenCourse(null)
    setSearching(null)
  }

  function openSeatPanel(courseId: string, view: "detail" | "search") {
    closeGenerators()
    setOpenSeat({ id: courseId, view })
    setOpenPlanned(null)
    setReqsOpen(false)
    setReviewPanel(false)
  }

  /* A course named in a prerequisite tree, opened like any other. The name
     comes from wherever the plan already knows it: a term, the outstanding
     list, the elective shelves, or the credits the student came in with. */
  function findEntry(code: string): CatalogEntry | null {
    const outstanding = REMAINING_REQUIREMENTS.find((entry) => entry.code === code)
    if (outstanding) return outstanding
    const elective = ALL_ELECTIVES.find((entry) => entry.code === code)
    if (elective) return elective
    const brought = INCOMING_CREDITS.flatMap((group) => group.items).find((i) => i.code === code)
    return brought ? { code, name: brought.name, reason: "Incoming credit" } : null
  }

  /* What the course sidebar does to whichever place in the plan its tab is
     on — the same whether it was opened from the plan or from a search. */
  const courseHandlers = {
    onPickSection: (at: Instance, section: string, meetings: Meeting[]) => {
      setPreview(null)
      setYears((current) => setSection(current, at.term.id, at.course.id, section, meetings))
    },
    onPreviewSection: (
      at: Instance,
      hovered: { section: string; meetings: Meeting[] } | null
    ) => setPreview(hovered ? { courseId: at.course.id, ...hovered } : null),
    onRemove: (at: Instance) => {
      handleRemoveCourse(at.course.id)
      setOpenPlanned(null)
    },
    onRegister: (term: Term) => setRegistering(term),
    /* The term on its week, with the sidebar still beside it. */
    onViewCalendar: (term: Term) => {
      setOpenTermOn("calendar")
      setOpenTermId(term.id)
    },
  }

  /* A course already in the plan, opened beside it. */
  function openPlannedPanel(courseId: string) {
    closeGenerators()
    setPreview(null)
    setOpenPlanned(courseId)
    setOpenSeat(null)
    setOpenCourse(null)
    setReqsOpen(false)
    setReviewPanel(false)
  }

  function cancelReview(id: string) {
    setReviews((current) => current.filter((review) => review.id !== id))
  }

  function toggleCollapsed(label: string) {
    setCollapsed((current) =>
      current.includes(label) ? current.filter((l) => l !== label) : [...current, label]
    )
  }

  function toggleMetadata(id: string) {
    const field = id as MetadataField
    setMetadata((shown) =>
      shown.includes(field) ? shown.filter((f) => f !== field) : [...shown, field]
    )
  }

  return (
    /* Around the whole shell, panel included: a requirement is picked up in the
       panel and let go over a term, and both ends of that have to be inside the
       same context. */
    <DndContext
      sensors={sensors}
      /* The drop slot changes the height of the term it opens in, so the
       * droppable rects have to be re-read as it does rather than measured
       * once at the start of the drag. */
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      /* pointerWithin only reports droppables the cursor is actually inside,
       * so releasing over a locked term (or empty canvas) resolves to no
       * target and the course snaps back instead of landing somewhere near. */
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragCancel={() => {
        setDraggingId(null)
        setDrop(null)
      }}
    >
    <PlanIssuesProvider years={shown}>
    <AppShell
      /* Opened from a student's record, the planner is still a staff member
         looking at somebody else's plan, so the nav stays the institution's
         list rather than becoming the student's own. */
      section={opened ? "staff" : "plan"}
      navTerms={opened ? undefined : scheduleTerms}
      /* A term view stands on its own term where the nav lists it, and on Plan
         Your Path where it does not — a term with no schedule is somewhere you
         got to through the plan. */
      navCurrent={
        opened
          ? "Students"
          : openTerm && scheduleTerms.some((term) => term.name === openTerm.name)
            ? openTerm.name
            : undefined
      }
      /* Drawn and going nowhere: neither the assistant nor the pill beside it
         does anything in these prototypes, so they are not offered. */
      assistant={false}
      panel={
        (generatingTerm && findTerm(years, generatingTerm) ? (
          <GenerateTermPanel
            term={findTerm(years, generatingTerm)!}
            standing={standing}
            mode={findTerm(years, generatingTerm)!.scheduled ? "schedule" : "term"}
            options={
              drafts?.options[0]?.id.startsWith("term-")
                ? drafts.options.map((option, i) => ({
                    id: option.id,
                    label: option.label,
                    blurb: option.blurb,
                    added: drafts.made[i].added,
                    /* The week this option came out as, which is what its card
                       reports on when the term has a schedule. */
                    term: findTerm(drafts.made[i].years, generatingTerm) ?? undefined,
                  }))
                : undefined
            }
            selectedOption={optionId}
            onSelectOption={setOptionId}
            compare={compare}
            onCompareChange={setCompare}
            onFraming={() => setFraming(true)}
            onGenerate={startTermDraft}
            onClose={() =>
              confirmLeave(() => {
                dropDraft()
                setGeneratingTerm(null)
              })
            }
          />
        ) : null) ||
        (generateOpen && (
          <GeneratePlanPanel
            standing={standing}
            graduation={expectedGraduation(years)}
            terms={selectableTerms(years)}
            keepTerms={releasableTerms(years)}
            campus={planCampuses(years)}
            options={optionSummaries}
            selectedOption={optionId}
            placeholders={placeholders}
            onSelectOption={setOptionId}
            onFraming={() => setFraming(true)}
            onGenerated={startDraft}
            onDiscardDraft={dropDraft}
            onApply={draft && !accepting ? () => setApplying(true) : undefined}
            onClose={() =>
              confirmLeave(() => {
                dropDraft()
                setGenerateOpen(false)
              })
            }
          />
        )) ||
        /* Last in line: a generator being open is what you are doing now, and
           the reviews are what you asked for earlier. */
        (course == null && seat && (
          <PlaceholderPanel
            /* Keyed on the seat and the view it opened on, so opening another
               — or the same one from its search button — starts there rather
               than wherever the last one was left. */
            key={`${seat.course.id}-${openSeat?.view}`}
            course={seat.course}
            term={seat.term}
            initialView={openSeat!.view}
            /* The seat stays open underneath, and is remembered on its list
               rather than its detail, so coming back from a course lands where
               the course was picked from. */
            onOpenCourse={(entry) => {
              setOpenSeat({ id: seat!.course.id, view: "search" })
              setOpenCourse({ entry, from: seat!.course.name })
            }}
            onEmpty={() => {
              handleEmptySeat(seat!.course.id)
              setOpenSeat({ id: seat!.course.id, view: "detail" })
            }}
            onClose={() => setOpenSeat(null)}
          />
        )) ||
        (plannedOpen && (
          <CoursePanel
            key={plannedOpen.course.id}
            entry={
              findEntry(plannedOpen.course.code) ?? {
                code: plannedOpen.course.code,
                name: plannedOpen.course.name,
                reason: "Business core",
              }
            }
            terms={plannableTerms}
            plan={allTerms}
            opened={{ course: plannedOpen.course, term: plannedOpen.term }}
            backLabel={plannedOpen.term.name}
            /* Planned again, and the sidebar stays on the course with a tab
               for the new term. */
            onAdd={(termId) =>
              handleAddCourse(
                termId,
                findEntry(plannedOpen.course.code) ?? {
                  code: plannedOpen.course.code,
                  name: plannedOpen.course.name,
                  reason: "Business core",
                }
              )
            }
            {...courseHandlers}
            onBack={() => setOpenPlanned(null)}
            onClose={() => setOpenPlanned(null)}
          />
        )) ||
        (course && (
          <CoursePanel
            /* Per placeholder as well as per course: the same course opened to
               fill another placeholder starts on that placeholder's term. */
            key={`${course.entry.code}-${seat?.course.id ?? "plan"}`}
            entry={course.entry}
            terms={plannableTerms}
            plan={allTerms}
            backLabel={course.from}
            filling={seat?.term.id}
            {...courseHandlers}
            onAdd={(termId) => {
              /* Opened from a seat still waiting for a course, and put in that
                 seat's own term, this fills the seat rather than landing beside
                 it — which is what the student asked for by searching from it. */
              if (seat?.course.placeholder && seat.term.id === termId) {
                handleFillSeat(seat.course.id, course.entry)
                return
              }
              /* Either way the sidebar stays on the course, now on a tab for
                 the term it went to. Closing it is the student's call. */
              handleAddCourse(termId, course.entry, course.requirement)
            }}
            onBack={() => {
              /* Walked here from another course, the way back is that course
                 rather than the way out. */
              const back = course.back
              setOpenCourse(back && "entry" in back ? { entry: back.entry, from: back.from } : null)
              if (back && "planned" in back) setOpenPlanned(back.planned)
            }}
            onClose={() => {
              setOpenCourse(null)
              setOpenSeat(null)
              setReqsOpen(false)
            }}
          />
        )) ||
        (searchTerm && (
          <CourseSearchPanel
            key={searchTerm.id}
            entries={addable}
            backLabel={searchTerm.name}
            onOpenCourse={(entry) => setOpenCourse({ entry, from: "course search" })}
            onBack={() => setSearching(null)}
            onClose={() => setSearching(null)}
          />
        )) ||
        (reqsOpen && (
          <RequirementsPanel
            entries={requirements}
            years={shown}
            narrowing={narrowing}
            onNarrow={setNarrowing}
            onClose={() => setReqsOpen(false)}
            onOpenCourse={(index) => {
              const found = requirements.find((r) => r.index === index)
              if (found) {
                setOpenCourse({
                  entry: found.entry,
                  requirement: found.index,
                  from: "remaining courses",
                })
              }
            }}
          />
        )) ||
        (reviewPanel && (
          <ReviewPanel
            reviews={reviews}
            years={years}
            onCancel={cancelReview}
            onClose={() => setReviewPanel(false)}
          />
        ))
      }
    >
      {/* relative so the draft's ring can be drawn over whatever is on screen
          without moving anything that is already on it. */}
      <MetadataProvider shown={metadata}>
      <PendingReviewProvider terms={pendingTerms}>
      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* The bar arrives with the frame, before there is a plan to put in it,
            and fills as the plan lands. */}
        {(draft || framing) && (
          <DraftBar
            added={landedTally.added}
            removed={landedTally.removed}
            showRemoved={draft ? draft.removed > 0 : true}
            terms={touchedTerms}
            pending={draft == null}
            leaving={accepting}
            onExit={() =>
              confirmLeave(() => {
                dropDraft()
                setGenerateOpen(false)
              })
            }
            onAccept={keepDraft}
            applyHere={!generateOpen}
          />
        )}

        {openTerm ? (
          <TermView
            /* Keyed on the term so switching to another one opens it as itself
               — on its calendar if it has one — rather than inheriting the view
               the last term was being read in. */
            key={`${openTerm.id}-${openTermOn ?? "default"}`}
            term={openTerm}
            startOn={openTermOn}
            tabs={yearTabs(
              shown,
              yearOf(shown, openTerm.id),
              () => setOpenTermId(null),
              openTermView
            )}
            metadata={metadata}
            onToggleField={toggleMetadata}
            onRegister={() => setRegistering(openTerm)}
            onPickSection={pickSection}
            preview={preview ?? undefined}
            onGenerateTerm={() => {
              setReqsOpen(false)
              setGeneratingTerm(openTerm.id)
            }}
            onRequestReview={() => setRequesting({ term: openTerm })}
            requested={requested && pending!.terms.includes(openTerm.id)}
            onShowReview={openReviewPanel}
            generators={generators}
            sidebar={{ open: reqsOpen, onToggle: openRequirements }}
            addable={addable}
            onAddCourse={(entry) => handleAddCourse(openTerm.id, entry)}
            onSearchCourses={() => {
              closeGenerators()
              setSearching(openTerm.id)
              setOpenCourse(null)
              setOpenPlanned(null)
              setOpenSeat(null)
              setReqsOpen(false)
            }}
            onOpenCourse={openPlannedPanel}
            onOpenSeat={(courseId) => openSeatPanel(courseId, "detail")}
            compare={compare}
          />
        ) : (
          /* @container so the planner reflows to its own width — the panel
             opening matters as much as the viewport shrinking. */
          <main className="@container flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto p-6">
          <PlanHeader
            actions={planActions(metadata, generators, requested)}
            tabs={yearTabs(shown, undefined, () => setOpenTermId(null), openTermView)}
            pressed={generateOpen}
            onAction={(action) => {
              if (action.toggles) {
                /* One panel at a time, and its button says which. */
                if (!generateOpen) setReqsOpen(false)
                setGenerateOpen(!generateOpen)
              }
              else if (action.label === "Request review") setRequesting({ term: null })
              else if (action.label === "Requested") openReviewPanel()
            }}
            onToggleField={toggleMetadata}
            sidebar={{ open: reqsOpen, onToggle: openRequirements }}
          />

          {/* What was asked for and has not come back. A term carries the same
              news on its own card; this says it once for the whole plan. */}
          {pending && (
            <Alert variant="warning" className="items-start">
              <Icon name="outlined-flag" size={16} className="mt-0.5 shrink-0 text-warning-50" />
              <AlertBody className="gap-1">
                <span className="text-body-md font-semibold text-foreground">Pending Review</span>
                <span className="text-body-md text-foreground">
                  {requestedLine(pending)}{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setReviewPanel(true)
                      setReqsOpen(false)
                    }}
                    className="cursor-pointer underline [text-underline-position:from-font]"
                  >
                    View details
                  </button>
                </span>
              </AlertBody>
            </Alert>
          )}

          {/* Keyed on the option so switching one replays the entrances rather
              than swapping the cards in place. */}
          <div key={draft ? `draft-${streamId}` : "plan"} className="contents">
            <IncomingCredits
              groups={incoming}
              collapsed={collapsed.includes(INCOMING_LABEL)}
              onToggleCollapse={() => toggleCollapsed(INCOMING_LABEL)}
            />

            {shown.map((year) => (
              <YearSection
                key={year.label}
                year={year}
                collapsed={collapsed.includes(year.label)}
                onToggleCollapse={() => toggleCollapsed(year.label)}
                settling={accepting}
                revealed={revealed}
                drop={drop}
                renderAlert={(term) => termBanner(term, draft != null, setRegistering)}
                onRemoveCourse={handleRemoveCourse}
                onSearchCourses={(termId) => {
                  closeGenerators()
                  setSearching(termId)
                  setOpenCourse(null)
                  setOpenPlanned(null)
                  setOpenSeat(null)
                  setReqsOpen(false)
                }}
                onOpenTerm={openTermView}
                onOpenSeat={openSeatPanel}
                onOpenCourse={openPlannedPanel}
                openSeatId={openSeat?.id ?? null}
                onAddTerm={() => addYearTerm(year.label)}
                onPickSection={pickSection}
              />
            ))}
          </div>

          {/* ---------------------------------- Add year */}
          <section className="flex items-start gap-4">
            <div className="flex w-6 shrink-0 flex-col items-center justify-center self-stretch">
              <Icon name="fiber-manual-record" size={24} className="text-gray-40" />
            </div>
            <AddSlot
              tone="year"
              onClick={() => setYears((current) => addYear(current))}
            >
              + Add Year {nextYearNumber(shown)}
            </AddSlot>
          </section>
          </main>
        )}

        {(draft || framing) && <DraftOutline leaving={accepting} pending={draft == null} />}

        {/* Kept level with the plan rather than inside a term, so it survives
            moving between the canvas and a term while it is open. */}
        <ApplyPlanDialog
          open={applying}
          added={landedTally.added}
          removed={landedTally.removed}
          terms={touchedTerms}
          onCancel={() => setApplying(false)}
          onAccept={() => {
            setApplying(false)
            keepDraft()
          }}
        />

        <DiscardDraftDialog
          open={leaving != null}
          /* Named the way the panel lists it: the generated ones by number,
             the one holding your own changes by its name. */
          selected={(() => {
            const at = optionSummaries.findIndex((o) => o.id === optionId)
            if (at < 0) return null
            const o = optionSummaries[at]
            return o.blurb ? `Option ${at + 1}` : o.label
          })()}
          others={Math.max(0, optionSummaries.length - 1)}
          onKeep={() => setLeaving(null)}
          onDiscard={() => {
            leaving?.()
            setLeaving(null)
          }}
        />

        <RegisterDialog
          term={registering && (findTerm(years, registering.id) ?? registering)}
          onClose={() => setRegistering(null)}
          onRegister={register}
          /* What cannot go is fixed in the panel beside the plan, so the
             dialog steps aside for it: a seat opens to have a course chosen,
             a course opens on its details. */
          onOpenCourse={(course) => {
            setRegistering(null)
            if (course.placeholder) openSeatPanel(course.id, "detail")
            else openPlannedPanel(course.id)
          }}
        />

        {/* Keyed so the dialog starts afresh each time it is opened — from a
            term it opens on its second step, from the plan on its first. The
            prefix matters: the open term is a sibling here and carries its own
            id as a key, and two siblings sharing one key makes React draw them
            both. */}
        <ReviewDialog
          key={`review-${requesting?.term?.id ?? "plan"}`}
          open={requesting != null}
          years={years}
          term={requesting?.term}
          onClose={() => setRequesting(null)}
          onSubmit={submitReview}
        />
      </div>
      </PendingReviewProvider>
      </MetadataProvider>
    </AppShell>
    </PlanIssuesProvider>

    <DragOverlay>
      {dragging && <AuditRow course={dragging.course} overlay />}
      {draggingEntry && <RequirementRow entry={draggingEntry} overlay />}
    </DragOverlay>
    </DndContext>
  )
}
