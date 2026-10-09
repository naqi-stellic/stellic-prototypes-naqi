import { isValidElement, useState, type ReactNode } from "react"

import { Icon } from "@/components/icon"
import { useMediaQuery } from "@/lib/use-media-query"
import {
  SidebarMasthead,
  SidebarNav,
  type NavSection,
  type ScheduleTerm,
} from "@/components/layout/sidebar"
import { SectionContext } from "@/components/layout/section"
import { Topbar } from "@/components/layout/topbar"
import { Face } from "@/components/stellic/staff-chrome"
import { StudentFace } from "@/components/stellic/student-profile"
import { Button } from "@/components/ui/button"
import { SIGNED_IN } from "@/data/staff-home"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"

/* The shell owns the viewport: it never scrolls, so the sidebar and top bar
 * stay put and each content column scrolls on its own. That is also what makes
 * the resizable split work — the panel group needs a bounded height. */

/** What the top bar says, which is a fact about the nav rather than about the
 *  page: a student is tracking their own progress, and a staff member is
 *  looking at a student's. Three prototypes share the progress screen and all
 *  three say the same thing, because it is the same screen. */
const SECTION_TITLE: Record<NavSection, string> = {
  plan: "Plan Your Path",
  progress: "Track Progress",
  staff: "Student Progress",
}

export function AppShell({
  title,
  children,
  panel,
  section = "plan",
  navCurrent,
  navTerms,
  account,
  assistant = true,
  assistLabel = "Generate with Assistant",
}: {
  /** Overrides the section's own heading, which is almost never wanted. */
  title?: string
  children: ReactNode
  /** When present, the content area splits into a resizable two-column view. */
  panel?: ReactNode
  /** Which product the page belongs to — the sidebar stands on that row. */
  section?: NavSection
  /** Which nav row to stand on, where it is not the section's own default. */
  navCurrent?: string
  /** The terms the nav lists under Schedule, where the page knows them. */
  navTerms?: ScheduleTerm[]
  /** Replaces the account circle in the top bar. */
  account?: ReactNode
  /** Whether the assistant floats over the page at all. Off where the design
   *  does not draw it, which is every screen outside Team Plan. */
  assistant?: boolean
  /** What the pill beside the assistant offers to do next. `null` for a
   *  prototype that does not generate: the assistant keeps its own button. */
  assistLabel?: string | null
}) {
  /* Below the tablet breakpoint there is no room for two columns side by side,
   * so the split turns on its side and the panel sits under the planner. */
  const wide = useMediaQuery("(min-width: 768px)")
  /* Whether the nav is showing. Held here rather than in the sidebar because
     the shell is what has to give the width back. */
  const [nav, setNav] = useState(!panel)
  /* Opening a side panel folds the nav away: the planner is squeezed from
     both sides otherwise, and the panel is what you are reading now. Only on
     the opening of a panel — one panel giving way to another counts, so does
     the first — and the nav stays where the student puts it after that.
     Closing the panel does not bring it back. */
  const kind: unknown = isValidElement(panel) ? panel.type : panel ? "panel" : null
  /* Boxed, because a panel's type is a function and useState would call it. */
  const [shown, setShown] = useState({ kind })
  if (kind !== shown.kind) {
    setShown({ kind })
    if (kind) setNav(false)
  }

  return (
    /* Everything below knows which nav it is standing in, so a card deep in
       the page can tell a student's reading of this record from a staff
       member's without being handed it. */
    <SectionContext value={section}>
      <div className="flex h-screen flex-col overflow-hidden">
        {/* Two rows, not two columns: the nav's masthead stands beside the top
            bar and its links beside the page, so collapsing the nav takes the
            links away and the page runs to the left edge — it does not leave a
            60px rail down the whole screen for the page to sit behind. */}
        <div className="flex shrink-0">
          {/* The nav is 240px of a phone's 390 — it goes away, and the planner
              gets the width. */}
          <div className="max-md:hidden">
            <SidebarMasthead open={nav} onToggle={() => setNav(!nav)} />
          </div>
          {/* A student's own surfaces are signed in as the student, so the
              circle is his face. A staff screen is somebody else entirely. */}
          <Topbar
            title={title ?? SECTION_TITLE[section]}
            account={
              account ??
              (section === "staff" ? (
                <Face
                  photo={SIGNED_IN.photo}
                  initials={SIGNED_IN.initials}
                  color="#6f7782"
                  size={40}
                />
              ) : (
                <StudentFace size={40} />
              ))
            }
          />
        </div>

        <div className="flex min-h-0 flex-1">
          <div className="max-md:hidden">
            <SidebarNav section={section} open={nav} current={navCurrent} terms={navTerms} />
          </div>

          {/* The panel group is always mounted so `children` keeps its place in
              the tree; swapping the wrapper would remount the whole planner and
              throw away its scroll position and drag state. */}
          <div className="flex min-h-0 min-w-0 flex-1 bg-background">
            <ResizablePanelGroup
              orientation={wide ? "horizontal" : "vertical"}
              className="min-w-0 flex-1"
            >
              {/* Sizes are pixels in react-resizable-panels v4, so these are the
                  design's own numbers: a 434px panel beside the planner. */}
              <ResizablePanel minSize={wide ? 520 : 200} className="flex">
                {children}
              </ResizablePanel>
              {panel && (
                <>
                  {/* The 4px rail between planner and panel is the divider in
                      the design, so the drag handle is that rail rather than an
                      extra line. `after` widens the grab target, not the rail. */}
                  <ResizableHandle className="bg-gray-40 transition-colors hover:bg-primary-50 data-[resize-handle-state=drag]:bg-primary-50 max-md:h-1 max-md:after:h-3 md:w-1 md:after:w-3" />
                  <ResizablePanel
                    defaultSize={wide ? 520 : 420}
                    minSize={wide ? 340 : 200}
                    maxSize={wide ? 760 : undefined}
                    className="flex"
                  >
                    {panel}
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
            {/* Same rail, decorative, when there is nothing to divide. */}
            {!panel && wide && <div aria-hidden="true" className="w-1 shrink-0 bg-gray-40" />}
          </div>
        </div>
      </div>

      {assistant && (
      <div className="fixed right-10 bottom-10 flex max-w-[calc(100vw-3rem)] items-center gap-[10px] max-md:right-4 max-md:bottom-4">
        {panel && assistLabel && (
          /* A pill in the design, not the usual 4px button radius. On a phone
             it would sit on top of the panel it refers to, so only the
             assistant itself floats. */
          <Button size="sm" className="rounded-full max-md:hidden">
            {assistLabel}
          </Button>
        )}
        <button
          type="button"
          aria-label="Ask Stellic AI"
          /* Three quarters of the 58 the design draws. It floats over the
             page it is offered on, and at full size it was the loudest thing
             on a screen it is not the subject of. */
          className="flex size-[44px] shrink-0 items-center justify-center rounded-full bg-gray-100 text-white shadow-2xl"
        >
          <Icon name="auto-awesome" size={16} />
        </button>
      </div>
      )}
    </SectionContext>
  )
}
