import { DEGREE } from "@/data/plan"

/* Step 1: what the plan is for. Where the student stands is in the header, so
 * it is not said again here. The questions themselves start at step 2. */

export function GeneratePlanScope({ graduation }: { graduation: string }) {
  /* What the plan is for, which is more than one thing: the degree and the
     minor are both programmes with requirements to place, so they are both
     under Programs, each on its own line. */
  const planning: { label: string; values: string[] }[] = [
    { label: "Programs", values: [DEGREE.program, `Minor in ${DEGREE.minor}`] },
    { label: "Concentration", values: [DEGREE.concentration] },
    { label: "Expected Graduation", values: [graduation] },
  ]

  return (
    <>
      <div className="flex w-full flex-col gap-2">
        <h3 className="text-h400 font-semibold text-black">
          Let's plan the rest of your journey
        </h3>
        <p className="text-body-md text-gray-80">
          Answer three questions and we'll draft a term-by-term plan. You can change anything
          before you save it.
        </p>
      </div>

      <div className="flex w-full flex-col gap-2">
        <div className="flex items-center pb-2">
          <h4 className="text-body-md font-semibold text-gray-100">What we&rsquo;re planning</h4>
        </div>
        {planning.map((row) =>
          row.values.map((value, i) => (
            <div
              key={value}
              className="flex w-full flex-col gap-x-2 @xs:flex-row @xs:items-start"
            >
              {/* The label names the group, so a second programme sits under
                  the first rather than repeating it. */}
              <span className="text-body-md text-gray-80 @xs:w-[150px] @xs:shrink-0">
                {i === 0 ? row.label : ""}
              </span>
              <span className="min-w-0 flex-1 text-body-md text-gray-100">{value}</span>
              <button
                type="button"
                className="shrink-0 cursor-pointer text-body-md text-gray-80 underline [text-underline-position:from-font]"
              >
                edit
              </button>
            </div>
          ))
        )}
      </div>
    </>
  )
}
