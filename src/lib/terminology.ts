import type { Term } from "@/data/uow-terms"

/* Says the product in an institution's own words.
 *
 * The planner is written once, in Stellic's words. An institution that calls
 * a course a subject gets the same planner with its words swapped in as they
 * reach the page, so nothing about how it works can differ and a change to the
 * planner reaches every institution at once. What it swaps lives in a data
 * file; this is only how it is applied.
 *
 * Text is changed where React has put it — text nodes and the few attributes
 * a person reads — and again whenever React puts something new there. A node
 * already changed is left alone, because "school" is a word that has been
 * changed into "faculty" once and must not be changed again. */

const ATTRIBUTES = ["aria-label", "placeholder", "title", "alt"]
const SKIP = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT"])

function escape(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+")
}

const SMALL = new Set(["a", "an", "and", "at", "for", "in", "of", "on", "or", "the", "to"])

/** Whether a string is a label or a title rather than a sentence: every word
 *  but the small ones starts with a capital. */
function isTitle(text: string) {
  const words = text.match(/[A-Za-z]+/g) ?? []
  return words.every((w) => w[0] === w[0].toUpperCase() || SMALL.has(w))
}

/** Carries the case of what was written onto what replaces it: ALL CAPS stays
 *  loud, and a capital at the front stays at the front — of each word where
 *  the replacement is a name in a label ("Credit Points"), of the first
 *  where it is in a sentence ("Credit points"). */
function carryCase(found: string, to: string, whole: string) {
  if (found === found.toUpperCase() && /[A-Z]{2}/.test(found)) return to.toUpperCase()
  if (found[0] !== found[0].toLowerCase()) {
    return /\s/.test(to) && (/\s/.test(found) || isTitle(whole))
      ? to.replace(/\b\w/g, (c) => c.toUpperCase())
      : to[0].toUpperCase() + to.slice(1)
  }
  return to
}

export function translator(terms: Term[]) {
  const forms = new Map<string, string>()
  const words: string[] = []
  for (const term of terms) {
    const add = (from: string, to: string) => {
      forms.set(from.toLowerCase().replace(/\s+/g, " "), to)
      words.push(escape(from))
    }
    add(term.from, term.to)
    if (!term.singleOnly) {
      add(term.fromPlural ?? `${term.from}s`, term.toPlural ?? `${term.to}s`)
    }
  }
  /* Longest first, so "transfer credits" is read before "credits" could be. */
  words.sort((a, b) => b.length - a.length)
  const pattern = new RegExp(`\\b(${words.join("|")})\\b`, "gi")

  return (text: string) =>
    text.replace(pattern, (found) =>
      carryCase(found, forms.get(found.toLowerCase().replace(/\s+/g, " ")) ?? found, text)
    )
}

/** Translates everything under `root` now and everything React puts there
 *  after, until the returned function is called. */
export function useTerminology(root: HTMLElement, terms: Term[]) {
  const say = translator(terms)
  const textDone = new WeakMap<Node, string>()
  const attrDone = new WeakMap<Element, Record<string, string>>()

  function text(node: Text) {
    const value = node.nodeValue ?? ""
    if (textDone.get(node) === value) return
    const next = say(value)
    if (next !== value) node.nodeValue = next
    textDone.set(node, next)
  }

  function attributes(el: Element) {
    const done = attrDone.get(el) ?? {}
    for (const name of ATTRIBUTES) {
      const value = el.getAttribute(name)
      if (value == null || done[name] === value) continue
      const next = say(value)
      if (next !== value) el.setAttribute(name, next)
      done[name] = next
    }
    attrDone.set(el, done)
  }

  function walk(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) return text(node as Text)
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const el = node as Element
    if (SKIP.has(el.tagName)) {
      attributes(el)
      return
    }
    attributes(el)
    node.childNodes.forEach(walk)
  }

  const observer = new MutationObserver((records) => {
    /* Changing the page is itself a change to it; stop listening while it is
       done so it is not read back. */
    observer.disconnect()
    for (const record of records) {
      if (record.type === "characterData") text(record.target as Text)
      else if (record.type === "attributes") attributes(record.target as Element)
      else record.addedNodes.forEach(walk)
    }
    observer.observe(root, OPTIONS)
  })
  const OPTIONS: MutationObserverInit = {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ATTRIBUTES,
  }

  walk(root)
  observer.observe(root, OPTIONS)
  return () => observer.disconnect()
}
