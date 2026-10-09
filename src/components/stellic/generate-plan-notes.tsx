import { Textarea } from "@/components/ui/textarea"

/* Step 3: free-text context for the generator. The student writes it; nothing
 * fills it in for them. */

/** The kinds of thing worth saying, rather than one example to copy. */
const PLACEHOLDER = [
  "For example:",
  "• Term load: how many courses or credits per term",
  "• Course preferences: courses to include or avoid",
  "• Elective preferences: topics or electives you like",
  "• Anything else: work hours, terms off, summers",
].join("\n")

export function GeneratePlanNotes({
  value,
  onChange,
}: {
  value: string
  onChange: (next: string) => void
}) {
  return (
    <>
      {/* An instruction rather than a question: the heading is also what the
          box is called, so there is no second label over it. */}
      <div className="flex w-full flex-col gap-2">
        <h3 id="plan-instructions-heading" className="text-h400 font-semibold text-black">
          Add details for your plan
        </h3>
        <p className="text-body-md text-gray-80">
          Optional. Share your preferences to generate a plan closer to what you want.
        </p>
      </div>

      <Textarea
        aria-labelledby="plan-instructions-heading"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={PLACEHOLDER}
        className="h-[214px] resize-none px-3 py-2 text-body-md placeholder:text-gray-80"
      />
    </>
  )
}
