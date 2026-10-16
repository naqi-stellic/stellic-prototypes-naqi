# Planner

Opens at `/planner.html`. Entry: `src/pages/planner.tsx`.

The plan generator's prototype with nothing on offer to generate: the planner,
the term views, the calendar, registration and plan review, on a plan that has
already been made.

## A plan that already exists

The two prototypes open on different plans, because they are demonstrating
different things. The generator opens on a plan with almost nothing in it, so
that generating one has work to do. This one opens on a plan already made
(`src/data/planned-plan.ts`): four years of it, classes chosen as far ahead as
the school publishes them — the term under way and the one after it — and a
last year held as seats.

It is built from the same forty requirements rather than written out again, so
the two prototypes can never disagree about what the degree wants. Each one is
claimed once: a term asks for a requirement by its code and gets the first
nothing has taken, which is what makes two finance elective seats in the same
year two of the three the concentration asks for rather than the same one drawn
twice.

The last year is where the choosing is still to be done, so its electives are
held as seats rather than settled on courses. Two seats earlier in the plan have
been filled and say so, under the name of the requirement they answer. Spring
2027 holds three courses and a seat — twelve credits, which leaves the term
legible at a glance and the one thing wrong with it the only thing to look at.

Two kinds of thing can be wrong with a term, which is what the product itself
warns about: you are [missing a
prerequisite](https://learn.stellic.com/stellic-quickstart), or the course is
not likely to be offered that term. Both are read off data the plan already
holds — the prerequisite trees, and the offerings behind the Offered filter —
rather than written down as warnings.

They are not equally bad. A prerequisite that is not met is a course the
student cannot take, so it is red wherever it appears — the banner, the status
in the list, the card on the calendar — it says "Pre-requisites not met", and
registration will not put it through however chosen its class is: its tick in
the registration dialog is off and cannot be put on, and it is not counted in
what the button offers to register. Not likely to be offered is amber:
something to get round to. A seat with no course in it is neither —
it says what it is itself, and calling it an error only invites the argument
about whether it is one.

A course named in a prerequisite tree is a course like any other, so it opens
like one: hover it and it underlines, click it and it takes the panel's place —
in its term where the plan holds it, as a catalogue entry where it does not,
and the way back leads to the course you came from rather than out.

Where a course is drawn, the warning goes with it
([`1865:45317`](https://www.figma.com/design/baNPtCTTnk2E6SMio2xEDz/Plan-2.0-Scheduler?node-id=1865-45317)):
its glyph sits before the course code on the calendar's card, and opening the
course puts it as a banner between the term it is in and the plan's own choices
about it
([`1865:6212`](https://www.figma.com/design/baNPtCTTnk2E6SMio2xEDz/Plan-2.0-Scheduler?node-id=1865-6212)),
which is where you would go to do something about it.

A course carrying one says so on its own card, in the four-year view as well
as the term: the mark sits beside the code, red for the kind that stops the
course happening and amber for the kind to get round to. A seat never carries
one — it says what it is itself.

On the term itself each one is a line
([`1388:27475`](https://www.figma.com/design/8BFP4evDj7E5coGDemDrnF/New-Planner---Plan-Review?node-id=1388-27475)):
the course's code in bold, its name, what is wrong with it, and a link at the
end. What is wrong is said in three or four words: which prerequisite, and
where it has got to, is the course's own business, and the link is how you get
there. Where a class is what is missing the link searches for
one; otherwise it opens the course, which is where the rest of the answer is.

Spring 2027 has the red one, in the term registration is open for: a
fourth-year finance course whose prerequisite is two years away, which is the
mistake a planner exists to catch before the window closes. Fall 2027 has the
amber one — Operations planned into a Fall it does not run in, which the
advisor put there, and the card says so.

Two, and no more. Every other term is clean: a plan where each term has
something to fix is a plan nobody believes, and the two that are wrong are only
worth looking at because the rest are not.

Every card in a term wears its own colour. The accent down the side is how
you tell one from another at a glance — on the week, on the list, on the
canvas — and two cards in the same colour is the one thing it must not do, so
a term is passed through `distinctAccents` wherever it is built or moved into.
A course keeps what it came with unless something in that term already has it;
only a clash is given a free colour, so a plan does not repaint itself every
time something moves.

A class is chosen from the course itself. Its sections are hours out of the
same list the week is drawn from, so hovering one draws it on the calendar
where it would go — in the course's own accent, dashed, in place of the class
the student is in — and the plus beside it settles the course on that class. A
section sitting on an hour the term already keeps says which course it clashes
with instead of offering itself, and the list opens with the class they are in,
whether or not the catalogue lists it.

So no card carries a search of its own. A seat still does: there the thing to
find is a course, not a sitting of one.

A course dragged out of a term whose classes are published into one whose are
not arrives without its class — a sitting that does not exist yet is not a
sitting to keep.

Terms also hold what is not a course. An activity keeps hours the way a class
does, so it is laid out on the week beside the classes and listed under My
Activities — and on the canvas it has a group of its own under the credits
([`1017:192386`](https://www.figma.com/design/8BFP4evDj7E5coGDemDrnF/New-Planner---Plan-Review?node-id=1017-192386)),
because it takes no credits and answers no requirement. It has no code, no
section and no status either, which it has none of.

The term under way carries two of them; Spring 2027, Fall 2028 and Spring 2029
carry one each, far enough apart to say that a plan holds more than courses
without saying it on every card.

## Where each course came from

Every card can say who put it there, under Course details. There are four
answers, and the plan holds all four: the term under way was **synced from
SIS**, because registration for it already happened in the registrar's system;
most of what follows was **added by Pathway**, which is what a pathway is for;
three courses were **added by Mark**, the advisor — including the one planned
into a term it does not run in, so the mistake has a person behind it; and two
were **added by you**, along with anything moved or added while the prototype
is open.

First names, never usernames. The student reads as "you" because they are the
one reading it — except on the staff side, where the planner is opened from a
student's record and the reader is not Scott, so it says his name.

## What differs

One thing, passed to `PlanYourPath`: `generators={false}`, which takes Generate
plan off the plan header, Generate Term off a term's, and the assistant's
"Generate with Assistant" pill off the panel. The assistant's own button stays
— it is the shell's, not the generator's.

Generate Schedule stays, because the scheduler is already a product: it appears
on any term whose week is published, in either view, and nowhere else — not on
the canvas, and not on a term whose calendar is still disabled. It opens
nothing. Scenery, deliberately.

Everything else it has, including the requirements panel behind the sidebar
button, dragging out of it, and the incoming credits above the first year, is
the plan generator's.

The plan itself is the same `INITIAL_YEARS` the plan generator opens on, so the
two prototypes start from the same place and can be read against each other.
Everything else is the same components and the same behaviour, so a change to
either prototype's shared parts lands in both. What is meant to differ goes in
`src/pages/planner.tsx`.

## Opened from a record

`/planner.html?from=compliance` is the same planner standing on a different
student's plan: `recordPlan()` derives the terms from the audit, the nav stays
the staff nav, and the breadcrumb becomes the way back to the record. Opened on
its own, none of that happens and this is Team Plan's planner exactly.
