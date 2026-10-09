import { cn } from "cn"

import { Icon, type IconName } from "@/components/icon"
import { Badge } from "@/components/ui/badge"

type NavItem = {
  label: string
  /** 8x8 glyph inside the 16x16 ring; omitted items keep the ring as a spacer. */
  glyph?: IconName
  /** Ring reserved but invisible, so labels stay on one alignment. */
  spacerRing?: boolean
  trailing?: IconName
  strong?: boolean
  sub?: boolean
  active?: boolean
  badge?: string
  /** Where the row leads, on the rows that lead anywhere. The rest are drawn
   *  because the nav is the institution's own list and leaving them out would
   *  misrepresent it — they just have nothing built behind them. */
  href?: string
  /** A small chip after the label. Unlike `badge` this one is meant to be
   *  read: it says the row is new, not that something is waiting in it. */
  chip?: string
  /** What the row does on this page, where it opens something here rather
   *  than leading to another page — a term in the planner, say. */
  onSelect?: () => void
}

/* Which product the page belongs to. The nav is the same nav either way — what
 * differs is the row you are standing on, and whether Schedule is opened onto
 * its terms, which it is only where a term is what you came to work on. */
export type NavSection = "plan" | "progress" | "staff"

const SCHEDULE: NavItem = {
  label: "Schedule",
  glyph: "calendar-today",
  trailing: "expand-more",
}

/** A term the schedule reaches: the one under way, and any whose classes are
 *  out. A term that is only planned has no schedule to open. */
export type ScheduleTerm = {
  name: string
  inProgress?: boolean
  /** Opens the term, where the page can. */
  onSelect?: () => void
}

const TERMS: ScheduleTerm[] = [
  { name: "Fall 2026", inProgress: true },
  { name: "Spring 2027" },
]

const EXPLORE: NavItem[] = [
  { label: "Explore", strong: true, trailing: "s-arrow-down-fill" },
  { label: "Courses", strong: true, sub: true },
  { label: "Pathways", strong: true, sub: true },
  { label: "Programs", strong: true, sub: true },
]

/* The staff side of the product is a different nav altogether: it is a list of
   everything there is, not a path through one student's degree — so no rings
   either. A ring marks where you are on a path, and this is not one. */
const STAFF: NavItem[] = [
  { label: "Home", strong: true, chip: "Beta", href: "/staff-home.html" },
  { label: "Students", strong: true, href: "/students.html" },
  { label: "Programs", strong: true, href: "/program-instruction.html" },
  { label: "Courses", strong: true },
  { label: "Pathways", strong: true },
  { label: "Appointments", strong: true },
  { label: "Transfer", strong: true },
  { label: "Requests", strong: true },
  { label: "Reviews", strong: true },
  { label: "Staff", strong: true },
  { label: "Analytics", strong: true },
]

function nav(section: NavSection, current?: string, terms: ScheduleTerm[] = TERMS): NavItem[] {
  if (section === "staff") {
    /* Students is where a staff member spends the day, so it is where they
       stand unless the page says otherwise. */
    const on = current ?? "Students"
    return STAFF.map((item) => ({ ...item, active: item.label === on }))
  }

  const here = (label: string) => label === (current ?? (section === "plan" ? "Plan Your Path" : "Track Progress"))

  return [
    { label: "Home", glyph: "s-home" },
    { label: "Track Progress", glyph: "s-check", strong: true, active: here("Track Progress") },
    SCHEDULE,
    /* Opened onto its terms on the plan surfaces, where a term is the thing
       you came to work on; closed everywhere else. Standing on one of them is
       what a term view does, and it stands on Plan Your Path otherwise. */
    ...(section === "plan"
      ? terms.map((term) => ({
          label: term.name,
          spacerRing: true,
          badge: term.inProgress ? "In Progress" : undefined,
          active: current === term.name,
          onSelect: term.onSelect,
        }))
      : []),
    { label: "Plan Your Path", glyph: "s-navigation", strong: true, active: here("Plan Your Path") },
    ...EXPLORE,
  ]
}

const QUICK_LINKS = [
  "Academic Calendar",
  "Appointments",
  "Your Notifications",
  "Manage Settings",
  "Report an issue",
]

function NavRing({ item }: { item: NavItem }) {
  if (!item.glyph && !item.spacerRing) return null

  return (
    <span
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-full border border-white",
        item.spacerRing && "opacity-0"
      )}
    >
      {item.glyph && <Icon name={item.glyph} size={8} />}
    </span>
  )
}

/* The nav is two pieces in two rows, not one column: its masthead stands beside
 * the top bar, and its links stand beside the page. Collapsed, the masthead
 * stays — it is the way back — and the links go, which is what lets the page
 * start where the nav used to. Written as two components rather than one aside
 * so that collapsing changes the nav's width and nothing about where the page
 * sits in the tree: the planner keeps its scroll, its drag and its draft. */

/** The 72px-tall head of the nav, level with the top bar. */
export function SidebarMasthead({ open = true, onToggle }: { open?: boolean; onToggle?: () => void }) {
  /* Collapsed, the nav is only its own masthead: a 60px square of parchment
     holding the way back. The column below it goes entirely rather than
     becoming a rail of glyphs — a rail would have to abbreviate ten labels
     into ten icons, and the point of collapsing is to stop reading the nav,
     not to read a harder version of it. */
  if (!open) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={false}
        aria-label="Expand navigation"
        className="flex h-18 w-[60px] shrink-0 cursor-pointer items-center justify-center border-r border-b border-gray-40 bg-parchment text-gray-100"
      >
        {/* The same glyph the expanded masthead carries, turned about: its
            chevron points out of the nav rather than into it. */}
        <Icon name="s-menu-collapse" size={20} className="h-5 w-8 -scale-x-100" />
      </button>
    )
  }

  return (
    <div className="flex h-18 w-60 shrink-0 items-start border-b border-gray-40 bg-parchment p-5">
      <div className="flex min-w-0 flex-1 items-center justify-between">
        <img
          src="/brand/stellic-wordmark.svg"
          alt="Stellic"
          className="h-8 w-[139.156px] shrink-0"
        />
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={true}
          aria-label="Collapse navigation"
          className="shrink-0 cursor-pointer text-gray-100"
        >
          <Icon name="s-menu-collapse" size={20} className="h-5 w-7" />
        </button>
      </div>
    </div>
  )
}

/** Everything under the masthead. Collapsed, there is nothing: no width, no
 *  rail, and the page beside it takes the room. */
export function SidebarNav({
  section = "plan",
  open = true,
  current,
  terms,
}: {
  section?: NavSection
  open?: boolean
  /** Which row to stand on, where it is not the section's own default. */
  current?: string
  /** The terms under Schedule, where the page knows which have one. */
  terms?: ScheduleTerm[]
}) {
  if (!open) return null

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col gap-4 overflow-hidden bg-gray-100 pt-4 text-white">
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">
        <nav className="flex shrink-0 flex-col items-start border-b border-gray-60 pb-[15px]">
          {nav(section, current, terms).map((item) => (
            <a
              key={item.label}
              href={item.href ?? "#"}
              onClick={
                item.onSelect &&
                ((event) => {
                  event.preventDefault()
                  item.onSelect?.()
                })
              }
              aria-current={item.active ? "page" : undefined}
              className={cn(
                "flex h-9 w-60 shrink-0 items-center gap-2 px-6 py-2 text-white",
                item.badge && "justify-between",
                item.active && "bg-gray-80"
              )}
            >
              <span className={cn("flex items-center gap-2.5", item.sub && "pl-6")}>
                <NavRing item={item} />
                <span
                  className={cn(
                    "whitespace-nowrap text-body-md",
                    item.strong ? "font-semibold" : "font-medium"
                  )}
                >
                  {item.label}
                </span>
                {item.chip && (
                  <span className="rounded-[3px] bg-white/18 px-1.5 text-label-sm font-semibold text-gray-40">
                    {item.chip}
                  </span>
                )}
                {item.trailing === "expand-more" && <Icon name="expand-more" size={14} />}
              </span>
              {item.trailing === "s-arrow-down-fill" && (
                <Icon name="s-arrow-down-fill" size={14} />
              )}
              {item.badge && (
                <Badge variant="warning" className="opacity-0">
                  {item.badge}
                </Badge>
              )}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 flex-col items-start gap-4 px-6">
          <p className="text-label-sm font-medium text-gray-80">QUICK LINKS</p>
          {QUICK_LINKS.map((label) => (
            <a key={label} href="#" className="whitespace-nowrap text-body-md">
              {label}
            </a>
          ))}
        </div>
      </div>

      {/* The foot of the nav — a refresh time, the wordmark and the support
          button — is not drawn. None of the three is part of anything these
          prototypes are for: the time is a number that never changes, the
          wordmark is already at the top of the same column, and the button
          opens a chat nobody is on the other end of. The column ends where
          the links do. */}
    </aside>
  )
}
