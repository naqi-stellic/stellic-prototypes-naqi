import { createContext, useContext, type ReactNode } from "react"

/* Whether the institution registers students through Stellic. Some do not:
 * the planner is where a student plans, and registering happens somewhere
 * else, so nothing in it should offer, count down to or explain registering.
 * Held where anything drawing a banner, a checklist or a dialog can ask,
 * rather than threaded through every one of them. */

const Registration = createContext(true)

export function RegistrationProvider({
  offered,
  children,
}: {
  offered: boolean
  children: ReactNode
}) {
  return <Registration.Provider value={offered}>{children}</Registration.Provider>
}

export function useRegistration() {
  return useContext(Registration)
}
