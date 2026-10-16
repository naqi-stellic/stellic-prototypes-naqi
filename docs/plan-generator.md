# Plan Generator

A term-by-term degree planner. Opens at `/generator.html`. Page in
`src/pages/plan-your-path.tsx`, plan model and its moves in `src/data/plan.ts`,
planner components in `src/components/stellic/`.

Figma: [`209:35392`](https://www.figma.com/design/6BmYq3FqAnCpTZwzZ5DFcH/Plan-Generator?node-id=209-35392)
(page) and [`361:165640`](https://www.figma.com/design/6BmYq3FqAnCpTZwzZ5DFcH/Plan-Generator?node-id=209-37071)
(Generate Plan panel).

## Drag and drop

Planned courses can be picked up and dropped into any other planned term
(`@dnd-kit`). Registered terms are locked — `Term.locked` — so their courses
have no handle and can't be moved, and nothing can be dropped into them.
Hovering a movable course reveals what can be done to it, at the end of the
row: remove and a note, with a seat's search button after them. Only the search
button is there when the row is not hovered, and because the other two appear
to its left it does not move when they do — the pointer reaching for it finds
it where it was.

Collision detection is `pointerWithin` rather than `closestCorners` on purpose:
`closestCorners` always resolves to *some* droppable, so releasing over a locked
term would quietly drop the course into a neighbouring one. `pointerWithin` only
reports droppables the cursor is actually inside, so an invalid drop resolves to
no target and the course snaps back.

`moveCourse` and `removeCourse` own the state transitions and re-check `locked`
themselves, so the rule holds even if a future caller skips the UI.

## Adding a term

A year runs fall, spring, summer, and only the summer is optional — so "Add
Term" adds that
([`1020:250321`](https://www.figma.com/design/8BFP4evDj7E5coGDemDrnF/New-Planner---Plan-Review?node-id=1020-250321)),
after the spring, and stops offering once the year has one. A year already
behind you never offers it. The new term is a term like any other: it takes
drops from the plan and from the requirements panel, it opens on its own, and
it appears in the year filter's menu.

## Sample data

Figma is the source for layout, not content — its placeholder data contradicts
itself — so the sample plan is invented to hold together. The story: a student
starting a 120-credit, 40-requirement Business B.S. with a Finance
concentration and a Data Analytics minor — the pair being
the point: no pathway is built for every programme, concentration and minor
there could be. Three of the outstanding requirements answer to the minor
rather than the major (MIS 250, STAT 320 and a data elective seat), so it is
real in the plan without changing the forty or the hundred and twenty. They
arrived with 15 credits, are partway through Fall 2026, have started planning
Spring 2027, and the plan runs four years to 2029-2030 — which is what it takes
to place the forty. Nothing is earned yet, so the counts read 0 taken, 7
planned, 33 outstanding, and a generated plan fills every one of the eight
terms. Courses are 3 credits each.

Above the first year sits Incoming Credits
([`1393:60657`](https://www.figma.com/design/8BFP4evDj7E5coGDemDrnF/New-Planner---Plan-Review?node-id=1393-60657)
for the shape it started as): what the student arrived with, folded away like
the year below it. Two cards, as wide as a year's terms — Transfer Credits and Pre-Year 1 — each
saying what it earned, with its rows carrying what was brought in rather than
what it stands for here: another college's course and the college that taught
it, an exam and the score it was passed at. Which of our requirements they
answer to is the audit's business. Pre-Year 1 is different in kind — those are
courses of this campus, taken before the first year — so its rows read like any
other course of ours, minus the class. It is not a year and it holds no terms: none of this was taken
on a timetable this plan knows about, so `src/data/incoming.ts` keeps it as
what it is rather than as two invented semesters.

The total is said beside the heading. Each row's credits are a tag like any
other detail, so they answer to Course details and are not there until it asks
for them; what stays on the row is the one fact the kind is worth knowing by. Those credits are extra rather than
requirements, so the degree's forty and its hundred and twenty are untouched
and the generator has the same work to do. Make them count instead by striking
the matching entries off `REMAINING_REQUIREMENTS`. They are not idle, though:
they are the only thing the student has earned, so the prerequisite trees are
read against them.

Year one is a first year: Fall 2026 holds Introduction to Business, Business
Calculus, Business Technology Essentials, Introduction to Psychology and
Advanced Composition — the transfer credit for Composition I is what lets the
last of those be a 200-level course. The business core those lead to (micro,
macro, accounting, statistics, marketing, corporate finance) is on the
outstanding list rather than in the plan.

Spring 2027 holds two courses and a seat — ACCT 201 and ECON 201, whose classes
have been chosen, and a general elective with no course against it — and Fall
2027 holds two seats and nothing else, which is a student who knows they want
an elective there and has not picked one. The rest of the plan is empty, which
is the point of this prototype: 10 requirements placed, 30 to go
(`src/data/generator-plan.ts`). So the term reads "1 action required" — the seat — and one of its
two things can go through registration while the other cannot.

Anything visibly derived from that — year filter tabs, the "+ Add Year N"
label, expected graduation, the registration deadline, and the terms the nav
lists under Schedule — comes from the plan rather than being written down
separately. Schedule holds the terms that have one: the term under way and any
whose classes are out, which is Fall 2026 and Spring 2027 until a schedule is
generated for another. Opening one of those terms stands on it in the nav;
opening a term with no schedule stands on Plan Your Path, because that is how
you got there. Adjust `DEGREE` and `INITIAL_YEARS` in
`src/data/plan.ts` and the rest follows.

## Numbers

Every figure on screen derives from the plan rather than being written down
twice. Courses carry `credits`; a term's credit heading and its "Sep - Dec ·
12 credits" line sum their own courses; and the Generate Plan panel's standing
comes from `planStanding()`, which sorts the degree into four states rather
than two: completed is the credit the student arrived with plus any finished
term, under way is the term they are sitting in, planned is everything else in
the plan, and remaining is the balance against `DEGREE`. Requirements are one
per course, which is what makes "6 reqs · 18 credits" read consistently.

Four rather than two because the student is in four of them at once, and each
answers a different question the wizard asks. The term under way is not up for
planning — "keep everything already planned?" offers the five courses that
could move, not the ten courses there are — and the credit they walked in with
is credit, so "Existing credit" reads four courses and twelve rather than
nothing at all. Incoming credit sits in no term, which is what makes it
incoming, so it is handed to `planStanding` by the page that renders it rather
than found in the years.

So the panel tracks edits: drop a 3-credit course and Planned falls from 18 to
15 credits, Remaining rises to 81, the term heading and its meta line drop by
3, and the bar's orange segment narrows. The bar's segments are shares of the
degree's credits rather than the design's fixed pixel widths — the one place
the numbers being real costs a literal match to the frame.

Expected graduation is the last term the plan reaches, not a stored date.

Which classes go through is asked once, in the dialog that does it. The term
views carry no ticks: a checkbox on every card asked the same question five
times over and answered none of them, and a card is a thing to read rather
than a control.

So the dialog lists everything the term is holding, not only what can go. A
course with a class is ticked; a course with no class, a course whose
prerequisites are not met, and a seat with no course in it are each listed
with their tick off and fixed, saying which of those three it is. Untick one
and the title counts down with it — "Register 3 Courses" becomes two — and
Confirm sends exactly what is ticked.

The toolbar that holds at the top is two groups: which years are in view, and
what can be done to the plan. It gives things up in order rather than wrapping,
because a second row of buttons pushes the plan further down the page every
time the bar holds.

First the actions lose their words: each keeps the glyph that names it and
drops the label. Narrower still, and the years go too — all but two. Whichever
year is open stays, because it is the one you are standing in, and the overview
stays, because it is the way back out; on the canvas, where the overview is
what is open, the year kept beside it is the one the plan starts in. The rest
are still in the nav, and a year tab opens onto its terms from there.

The measure is the toolbar's own width rather than the window's, because the
pane is resizable and the panel beside it opens and closes. Where each step
happens depends on how many actions the row is carrying: two of them are 377px
of buttons and three are 560px — a term view adds Generate Schedule, the
longest label any of them has — against 541px of years. So the labels go below
1130px of toolbar where there are three and 960px where there are two, and the
years fold below 780px and 740px. All four are measured off the rendered rows,
and the first of them was 30px short to begin with: at 1117px a term view still
wrapped.

There is a third step, for the narrowest toolbar there is — a small window with
the requirements panel open beside it. The overview keeps its glyph and loses
its word, which only it can do: a grid means the whole plan, where "2026-2027"
as a symbol means nothing. Below about 390px of toolbar the row wraps anyway,
and that is where it is left: the pane is narrower than the panel beside it by
then, and the panel is the thing to drag.

In a term view the registration banner holds at the top with the toolbar
rather than scrolling away under it: everything on that page is something you
might register, and the button that does it should not be a scroll away. It
is drawn as a strip rather than a card — square, edge to edge, quieter than an
alert in the flow, because something that is always there cannot also be
something that shouts. Only this one: a warning is about a course you can
scroll to, and it belongs beside the term it is about. On the canvas, where
there are several terms at once, each keeps its own banner on its own card.

A term whose classes have all gone through registration keeps the same banner:
the window is still open, the closing date is still worth saying, and a student
can add a class and come back. What changes is the button — disabled, and
reading "Register" rather than offering to register none of them. The credit
group's marker fills in beside it: `pre-registered` is drawn solid where
`planned` is an outline, because that mark and the word next to it are the
whole of what registering changes on that screen.

## Where a generated course says it came from

The cards a run puts down say **"Added by you"**, not "Added by Pathway". A
pathway proposed them, but nothing is in the plan until the student accepts
the option — pressing Generate and keeping what came back is a thing they did,
and the plan they started from already records what the pathway did on its own
months earlier. So the seats Fall 2027 opens holding still read "Added by
Pathway, 3 Apr 2026", and everything the run adds beside them reads "Added by
you, 15 Sep 2026". A seat the run fills reads the same way: the seat was the
pathway's, the course in it is this run's.

## An instruction the plan answers

The instructions box starts empty, the way a box does. Clicking into it types
the sentence out — the student has a part-time job and would like a lighter
spring, if it does not cost them graduation — and the summary reads it back
under "Anything else". It is `useScript` from `src/lib/typing.ts`, the same
rhythm every prototype types at, at four tenths the pace: a hundred and twenty
characters at somebody's real rate is twelve seconds of a room watching a
cursor, and this way it lands in four and a half. Typing into the box yourself
stops the script and hands it back. See README, "Fields that fill themselves
in".

The seat's own box does the same with "Philosophy", at the ordinary rate,
because ten characters need no hurrying.

The first option answers it. `ease` on a `DraftOption` names one term and how
light to keep it, and that term is filled to four courses rather than the pace's
five, holding a general elective seat rather than the concentration elective it
opened with — which is the card that moves to Fall 2027, since nothing is
waiting on it. Graduation does not move, and the option says so. The other two
options hold to their own pace: the point of three options is that they differ.

The same is true a step further in. A held seat asks what kind of course should
fill it, and clicking into that box writes "Philosophy" — so the general
elective comes back as Logic & Critical Thinking rather than whichever course
the shelf happened to offer first. `preferredFirst` in `catalog.ts` is what reads it: a
subject's own words are kept beside its shelf, because "Philosophy" is written
on none of the courses that answer it.

## Four ways into a term

The plus at the head of a term view's course list opens the same menu the
canvas cards open — add an activity, add by course number, add by section
number, or search courses — because there is one question being asked and it
should have one answer whichever screen it is asked from. Two of those turn
the row into a field; the search opens beside the plan.

"+ Add Year" adds the year after the last one the plan reaches, which is the
same thing a generated plan does for itself when a light pace will not fit.

## Two kinds of instructions

The student writes theirs in the instructions step. The school's are read back
in the summary, as one more row under "Also accounting for" beside the settings
it already lists: `INSTITUTION_INSTRUCTIONS` for a plan or a term — core before
general, prerequisites, double counting, what the catalogue reaches, the credit
ceiling — and `SCHEDULE_INSTITUTION_INSTRUCTIONS` for a week, about seats,
campus, clashes and classes already chosen. Two lines each, built from
`PLANNING_RULES` and the scheduler's own rule rather than written out twice.

## Generate Plan panel

"Generate plan" toggles a side-by-side wizard
(`src/components/stellic/generate-plan-panel.tsx`) through `AppShell`'s `panel`
prop. The drag handle *is* the 4px rail the design already draws between the two
columns rather than an extra divider. Sizes are pixels in react-resizable-panels
v4, so they are the design's own numbers: the panel opens at 520px, clamps
between 340 and 760, and the planner keeps 520px.

**Step 1** shows Courses and Milestones progress, the plan summary, and a
keep-or-choose radio. "What we're planning"
([`367:181084`](https://www.figma.com/design/6BmYq3FqAnCpTZwzZ5DFcH/Plan-Generator?node-id=367-181084),
[`252:30410`](https://www.figma.com/design/6BmYq3FqAnCpTZwzZ5DFcH/Plan-Generator?node-id=252-30410))
lists every programme the plan is for under one Programs label, one line each
with its own edit, which is where the minor belongs: it has requirements to
place like any other programme, and three of the outstanding ones are its. The
concentration is a row of its own beneath them, as is the graduation the plan
reaches. The review screen reads the same rows back from `planSettings()`. Every figure comes from `planStanding()` — the tallies,
the bar shares, and the "Keep my N courses" copy — so Figma's own numbers there
are placeholders that were deliberately not copied.

**Step 2** sets pacing: Full-time, Part-time, or Custom. Custom expands in place
to a credits-per-term stepper and two term filters. Both filters are off by
default; switching one on reveals a search field that opens its options on focus
and collects picks as removable tags (`TermMultiSelect`, built on shadcn
`popover` + `command`).

The terms on offer come from `selectableTerms()`: every term in the plan that is
not already under way, **plus the summers**, which the planner canvas never shows
but a student can still choose to study through. So the list runs Spring 2027,
Summer 2027, Fall 2027 … Summer 2030 — eleven terms, where the canvas shows
eight.

**Step 3** is a free-text box for anything the generator should know.

**The summary** then reads the answers back. Its "Your choices" rows are not
re-stated copy — Keeping comes from step 1's radio, Pacing from
`describePace()` over step 2's state (so it grows "exclude: Summer 2029, Fall
2030" only when those were actually picked), and Anything else from step 3's
box. Answers live on the panel, so Back never loses one and Start over clears
them all.

The rows beneath, under "Also accounting for", are institution settings rather
than answers: `PLANNING_RULES` in `src/data/plan.ts`, except Existing credit
and Campus, which are summed and collected from the plan. The credit ceiling is
shared — `PLANNING_RULES.maxCreditsPerTerm` is both what the summary reports and
what step 2's stepper clamps to, so the two can't contradict each other the way
the frame's "max 30 per term" pacing and "max 18 per term" limit did.

Generate Plan itself does nothing yet — there is no design for what follows.

## Plan review

Figma: [`1017:234293`](https://www.figma.com/design/8BFP4evDj7E5coGDemDrnF/New-Planner---Plan-Review?node-id=1017-234293)
(pick terms), [`1017:234286`](https://www.figma.com/design/8BFP4evDj7E5coGDemDrnF/New-Planner---Plan-Review?node-id=1017-234286)
(pick request), [`1017:234450`](https://www.figma.com/design/8BFP4evDj7E5coGDemDrnF/New-Planner---Plan-Review?node-id=1017-234450)
(notes), and the submitted state on the plan
([`1017:234461`](https://www.figma.com/design/8BFP4evDj7E5coGDemDrnF/New-Planner---Plan-Review?node-id=1017-234461))
and on a term
([`1017:240068`](https://www.figma.com/design/8BFP4evDj7E5coGDemDrnF/New-Planner---Plan-Review?node-id=1017-240068)).

"Request review" opens a three-step dialog: which terms, what kind of request,
and anything to say with it. Opened from a term the first step is already
answered — the term is the request — so it opens on the second, and its corner
closes rather than going back.

Only terms still ahead and holding something are on offer. A term under way or
already taken cannot be reviewed — whatever an advisor would say about it, it
has happened — and neither can an empty one, since there is nothing in it to
have an opinion about. On the plan as it opens that is Spring 2027 alone; after
a plan is generated it is every term.

Submitting does three things: the plan takes a pending banner, every term in the
request takes a `PENDING REVIEW` mark (the same slot that says `REVIEWED`), and
the reviews panel opens beside the plan. A term's mark sits beside its name in
the term view and on its card in the planner; both read it from one context
rather than having it threaded down.

The panel is the frame at
[`1096:66987`](https://www.figma.com/design/8BFP4evDj7E5coGDemDrnF/New-Planner---Plan-Review?node-id=1096-66987):
one white card on the page's own grey, lifted by Figma's shadow/sm (added to
the theme as `--shadow-sm`) and framed by nothing — the tab strip is the top of
the card, and the requests are ruled sections under it. The
card runs a rail down three 24px markers — asked (green), with the advisor
(amber), complete (open) — against the reference plan and the terms. What the
advisor has to do and the button that closes the request are theirs, not the
student's, so neither is drawn here; Cancel Request is.

A request records where every course sat when it went out, so "N changes during
review request" and the Changes tab's count are the plan measured against
itself rather than a number kept by hand.

`src/data/review.ts` holds the request types, the advisor, and one request that
has already been round — which is why Fall 2026 carries a reviewed mark, and
what the panel's history row is.

Departures from the frame: the term groups are headed with the plan's own year
labels (`2026-2027`) rather than "Year 1", since that is what every other
surface here calls them; and the Changes and Graduation Clearance tabs are drawn
but empty, there being no design for either.

A seat that gets filled keeps saying what it was held for
([`1017:200563`](https://www.figma.com/design/8BFP4evDj7E5coGDemDrnF/New-Planner---Plan-Review?node-id=1017-200563)
before,
[`1393:30627`](https://www.figma.com/design/8BFP4evDj7E5coGDemDrnF/New-Planner---Plan-Review?node-id=1393-30627)
after): the requirement's name stays as a quiet strip and the course that
answers it stands under it, sharing the line between them. It reads the same
whichever way the seat was filled — searched from the seat by hand, or filled
by a generated term — because both write the same `seat` on the course. The
term view carries it too: a line above the code in the list, and a band across
the head of the card in the calendar, above the accent rather than beside it.

Filling is a change to the seat rather than something new arriving: `fillSeat`
turns the seat into the course where it stands, so nothing is added and nothing
removed, and the requirement it was answering is still answered. Picking a
course from a seat's search and adding it to that seat's own term fills it;
choosing a different term adds it there instead and leaves the seat where it
is.

Where the term's classes are already out, filling hands the course one. Only a
course with a class can go through registration, so a seat filled without one
would be a dead end: chosen, and still not registrable. The class is not marked
as the student's own choice — they picked the course, not the sitting of it —
so a generated schedule is free to move it.

Registering settles it. The class is the student's from then on, so the seat
has done its job: the band goes, and with it the way back to a held seat.

The name is the seat, so it opens the seat
([`1393:32366`](https://www.figma.com/design/8BFP4evDj7E5coGDemDrnF/New-Planner---Plan-Review?node-id=1393-32366)):
the same panel a held seat opens, with a Selected course block at the foot
naming what is standing in it and a bin that gives the seat back. The course
keeps the seat's own code and name while it stands there, which is what lets
`emptySeat` put it back exactly as it was — and why the seat is kept as a code
and a name rather than only the name.

## A course on its own

Clicking a course in the remaining list opens it beside the plan, built from
the course sidebar Ali shared: the course and its credits, then one card of
details — campus, term and Add to Plan; the sections on offer with their times,
instructors and seats; attributes, topics, description, required sections,
instructors; the prerequisite tree; equivalents, what it can count for, and
whether it repeats.

`src/data/course-detail.ts` builds all of that from the catalogue entry, the
way terms get their sections: seeded off the course code, so the same course
reads the same every time it is opened. The plan has no data about a course
nobody has taken, and inventing it per render would make the panel lie
differently each time.

How much a course asks for follows the number in its code, because that is what
the number means. A hundred-level course has no prerequisites and says so. A
two-hundred one has a single way in, which is not a choice, so it is drawn as
the requirements themselves — no Option head above them and no directive over
it. Three hundred gives two ways in and four hundred gives three, one of them
out of reach, and those are the ones headed "Complete any one of N options".
Only one of the ways can be the one the student takes, so only one of them
reads as green: the first is built from what they have and what they are
taking, and the others from a course nobody has started (grey, "Nothing
started") or a grade already in and under what the option asks for (red,
"Can't be met" — MIS 120 was passed at B and cannot be repeated). What each
option comes to is read off what is inside it rather than written by hand,
against the record the plan already holds: the ten courses passed in
the credits they arrived with and the five courses under way. So
a tree never claims a course was passed that the plan says is still to come,
and a group where one child is enough counts as one thing rather than as a
shortfall for the options the student did not take.

The panel is a stack of folded sections rather than one long column
([`1277:28303`](https://www.figma.com/design/8BFP4evDj7E5coGDemDrnF/New-Planner---Plan-Review?node-id=1277-28303)),
each headed by the glyph that names it: Planning details, Sections,
Description, Course details, Requisites, and then the two that speak about the
plan rather than about the course — Where it fits in your plan
([`1336:25474`](https://www.figma.com/design/8BFP4evDj7E5coGDemDrnF/New-Planner---Plan-Review?node-id=1336-25474))
and Activity history
([`1336:24862`](https://www.figma.com/design/8BFP4evDj7E5coGDemDrnF/New-Planner---Plan-Review?node-id=1336-24862)),
which start folded and appear only for a course the plan already holds. Where
it fits reads off the plan itself: what the course counts towards, grouped
under the thing it counts for, and anything put after it that asks for it,
which is why a subject's own courses gate each other — ACCT 310 names ACCT 201,
which the plan holds in Spring 2027, and nothing before a course can depend on
it.
Activity history is the same course seen the other way round: when it landed
where it is, and what it was moved from.

Courses in a term that is finished or under way open the same way — they are
not editable, but they are still courses, so the row opens the panel and the
Actions menu drops Remove. The term tag beside the name is green and says Taken
where the credits are already the student's, amber where they are only
promised. The only rows on the canvas that do not open are the incoming
credits, which are not courses of this plan.

A course already in the plan opens on the same panel, from its row on the
canvas or in a term view
([`1:13691`](https://www.figma.com/design/h39YRs9jNEWO4JLmKrh5sh/Course-Sidebar-2.0?node-id=1-13691)).
What changes is the head and the foot. The card is headed by the term holding
it, on the plan's blue, naming the topic and the class it is in with an Actions
menu beside them; then the plan's own choices — campus, topic, sub-term, level,
units, grading — each with an edit, and the class the student is in ticked among
the sections. Course Details, which heads an unplanned course, goes to the foot
as a folded card: what is left to offer a course already planned is planning it
again somewhere else, so opening it gives the campus, the term and Add to Plan.
Everything between is the same, prerequisite tree included, which is the new
design rather than the one in that frame.

Add to Plan does what it says — the course lands in the term the picker names
and leaves the remaining list — and Remove, in the Actions menu, takes a planned one out. The section
rows' pluses, the bookmark and the edits are drawn but not wired, and a nested
group inside an option cannot be folded away on its own, only the option can.

## A seat on its own

Figma: [`1017:207673`](https://www.figma.com/design/8BFP4evDj7E5coGDemDrnF/New-Planner---Plan-Review?node-id=1017-207673)
(the seat) and
[`1017:208517`](https://www.figma.com/design/8BFP4evDj7E5coGDemDrnF/New-Planner---Plan-Review?node-id=1017-208517)
(the search it opens).

Clicking a held seat opens it beside the plan: what it is holding a place for,
the term holding it, the note it has not got, and the credits it stands for.
The seat itself is outlined while its panel is open. "Find eligible courses"
turns the panel into the course search — the courses that could fill this seat,
a finance one for a finance seat — and "Back to …" returns. The seat's own
search button goes straight there.

Clicking one of those courses opens it on its own — the same panel a course
from the remaining list opens, in its unplanned state, since none of them is
anywhere in the plan yet. The way back says the seat's name and lands on the
list it was picked from rather than on the seat's own details.

The search is a list, not a search: nothing filters it, and the count beside
its heading is the design's.

## Add remaining courses

Figma: [`1017:189481`](https://www.figma.com/design/8BFP4evDj7E5coGDemDrnF/New-Planner---Plan-Review?node-id=1017-189481).

The sidebar button in the toolbar opens what the degree still wants: the shares
of the forty requirements — taken, planned, still to place — and then the
outstanding requirements grouped the way the degree asks for them. Each row is dragged out of the panel and dropped into the term
it is going to be taken in, which is the same move as "+ Add to Term" and lands
the same card.

The drag context wraps the whole shell rather than the planner alone, because a
row is picked up in the panel and let go over a term and both ends have to be
inside it. A requirement has no place in the plan to leave, so it is always
added at the end of the term it lands on, and the drop preview says so.

A term opened on its own takes drops too: its course list registers the same
droppable under the same term id, so a requirement dragged out of the panel
lands in the term being read rather than only on the canvas. The card header's
plus opens the same menu the planner's "+ Add to Term" opens, so a term can be
planned into with or without the panel.

Thirty-three requirements in the order the degree asks for them is the
registrar's order, and it says nothing about which of them could be acted on
today. Three filters say it — what it is, when it runs, and whether its
prerequisites are met — and they layer: Only core courses, offered in Fall,
prerequisites Met leaves the dozen or so that could go into the next term.
The row is the one Advanced What-If uses, lifted out of it into
`filter-bar.tsx`, so both screens ask their own questions through the same
buttons, popovers and pills. A field whose answers can be layered keeps the
search box that collects them as tags; one that takes a single answer gets a
select in the same titled box.

Two of the three read what the plan already holds: a seat knows it is a seat,
and the prerequisite tree already says whether an option is earned. When a
course runs is new, seeded off the code the way sections are — the foundations
every semester, a fourth-year elective once a year — which is what makes the
question worth asking at all, and what "Only Fall" is warning about where the
list is grouped by term rather than by requirement.

What the list is narrowed to is held by the page rather than by the panel:
opening one of these courses closes the panel to make room for it, and coming
back finds the list as it was left.

"+ Add to Term" opens four ways of putting something in
([`1017:187868`](https://www.figma.com/design/8BFP4evDj7E5coGDemDrnF/New-Planner---Plan-Review?node-id=1017-187868)).
Two of them turn the slot itself into a field
([`1017:191036`](https://www.figma.com/design/8BFP4evDj7E5coGDemDrnF/New-Planner---Plan-Review?node-id=1017-191036)):
type a course number the term could take and it lands. Search courses opens the
same search a seat opens
([`1017:194366`](https://www.figma.com/design/8BFP4evDj7E5coGDemDrnF/New-Planner---Plan-Review?node-id=1017-194366)),
listing what the plan still wants rather than what one seat could take, with
the filters drawn and not wired. Add activity is drawn and goes nowhere: it is
a flow of its own and not one these prototypes are about.

A requirement leaves the list once it has a term. A course is recognised by its
name wherever it was placed from; a seat cannot be — every seat reads alike —
so a placed seat remembers which outstanding requirement it answers, and the
generator's seats remember it too. That is what keeps the three shares summing
to forty: after generating the whole plan the panel reads 0 taken, 40 planned,
0 to place.

The panel's refresh button is not built: there is nothing behind it to re-read,
the list being derived from the plan on screen.

## What a generated schedule moves

A class the student chose stays where it is: `PlannedCourse.settled` marks one
picked by hand — Spring 2027's ACCT 201, and anything settled through "Search
sections" — and a run fills the term's unscheduled courses around it rather than
moving it. Its hour is struck off the option's order so nothing lands on top.

A class an earlier run proposed carries no such claim, so generating again
times it afresh and draws where it used to be behind it. That is what "Compare
with current schedule" has to show, and why a first run over a term nobody has
timetabled shows no ghosts at all.

No slot is shorter than an hour and a quarter — eighty pixels — which is what a
block needs for its code, its name and its section.

A generated term hands back a term ready to register, which is a rule about
what it is allowed to offer rather than something checked afterwards. A course
only joins the queue if it runs in that season and everything it asks for is
already behind it — passed, under way, or in a term planned before this one.
Not merely "not planned after it": a run that puts a course and the course it
depends on into the same term has answered nothing. There is always a
lower-level requirement to take instead, so the term fills either way.

A seat holds to the same rule from its own shelf. Where nothing on it is ready
— every finance elective wanting a course the student has not had — the seat
stays a seat rather than being answered with the wrong kind of course, and a
seat is not something to warn about.

Which of the three weeks comes out on top is `scoreSchedule`, and a day the
student took off the list is not scored at all: it disqualifies. Four days out
of five is not four fifths of an answer — somebody who says they cannot come in
on Friday means it — so a week that uses an excluded day ranks below every week
that does not, however tidy it is otherwise, and its Days of Week dots say one
rather than three. Without that, a Friday-free week and a five-day week both
scored full marks on days and the tidier one won on density, which is how the
option that answered the question came second.

## Responsive

`main` is the `@container`. Term cards sit side by side above `@3xl` (768px of
planner) and stack below it. The wizard is its own container, so its label/value
rows stack once the panel is dragged under 320px. The registration banner wraps
its closing date to a second line rather than truncating, growing from 92px to
120px when it does.

The sidebar is a fixed 240px at every width, and the button in its masthead
folds it away. Collapsed, only the masthead is left — a 60px square of
parchment level with the top bar — and the planner runs to the left edge on
the same 24px gutter it keeps on the right. That is why `AppShell` is two
rows rather than two columns: the nav's masthead stands beside the top bar
and its links beside the page, so taking the links away gives the page the
width instead of leaving a rail for it to sit behind. The planner's place in
the tree does not change either way, so collapsing the nav mid-draft keeps
the draft, the scroll and any drag in progress.

## What opens folded

The credit brought in, and any year already finished. Both are a record rather
than a plan — there is nothing left to do to either — so they state what they
came to and keep it behind the chevron. Team Plan's own plan starts at the year
under way and has no finished years in it; a plan opened from a student's
record does.

## Fidelity

Diffed against a 1:1 export of the Figma frame at 1920×2184. Every structural
landmark — card borders, row borders, section offsets, the timeline rail — lands
on the same pixel; the residual ~0.8% differing pixels are text antialiasing
between Figma's renderer and Chrome's. With the panel open the split measures
1242 / 4 / 434, matching the frame exactly.

`reference/index.html` is the original static build, kept as the baseline the
React app was verified against. It has no dependencies — open it directly.

Deliberate departures from the frame:

- the sidebar's help block is pinned to the bottom of the viewport (in Figma the
  nav column overruns the artboard, so it falls below the fold);
- the 4px scroll track on the right edge doubles as the resize handle;
- the FAB keeps a 40px right margin in both states rather than shifting 10px
  when the panel opens;
- the registration banner's Register Now button sits 4px higher than the frame,
  because 92px is now the banner's natural height rather than a fixed one it
  could not grow past.
