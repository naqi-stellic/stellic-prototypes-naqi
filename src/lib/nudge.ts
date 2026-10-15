import { useEffect, useRef, useState } from "react"

/** How long the cursor rests on something that can be moved before it shakes. */
export const NUDGE_AFTER = 1500

/* Something that can be picked up says so once the cursor has rested on it for
 * a moment: a short shake, which is how a thing that moves announces it. Gone
 * the moment the cursor leaves, and never offered where it cannot be moved.
 *
 * Spread `props` on the element and add `animate-nudge` while `nudged`. */
export function useNudge(movable: boolean) {
  const [nudged, setNudged] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const props = {
    onMouseEnter: () => {
      if (!movable) return
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setNudged(true), NUDGE_AFTER)
    },
    onMouseLeave: () => {
      clearTimeout(timer.current)
      setNudged(false)
    },
    onAnimationEnd: () => setNudged(false),
  }

  return { props, nudged: nudged && movable }
}
