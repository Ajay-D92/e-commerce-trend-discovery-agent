# Design decisions

One entry per decision: what I chose, the alternative, why, and what it costs.

| # | Decision | Alternative | Why | Trade-off |
|---|---|---|---|---|
| 1 | Code computes counts, prices and comparisons. The model writes wording | Let the model summarise the data | A model once misfiled a comparison that code can compute exactly (failure 5). Counts are reproducible | More code to maintain and less fluent prose |
| 2 | The model returns JSON only, and code filters every string | Put model text straight into the page | Free text can carry invented numbers and claims | The filter is a list of patterns, so new phrasing can get past it (failure 8) |
| 3 | A failure returns an empty result with a named status | Fill the gap with a default segment or text | A brief that says why it is empty is easier to trust than plausible filler | Some runs return nothing useful |
| 4 | Evidence level from the share of posts that mention a segment's attributes: below 0.2 weak, up to 0.5 moderate, above 0.5 stronger | Ask the model to rate its own confidence | A count can be checked. A self-rating cannot | The cut-offs are my judgment and are not validated |
| 5 | Confidence stops at medium | Allow "high" | The data is small and dated: 13 posts, mostly old | A segment with strong support is still capped |
| 6 | An article claim is kept only if its quote appears in the stored text and any number in the claim appears in the quote | Trust the model's summary of the article | It blocks paraphrases that drift from the source | Some true claims are dropped when the quote is weak |
| 7 | Three briefs. Supplier and leadership are written by code, and only marketing is written by a model | Have a model write all three | Supplier and leadership readers need counts. Marketing readers need ideas to test | Less natural wording on two of the three pages |
| 8 | Build and test one stage at a time with mock data | Build the whole workflow and test it with live calls | Model calls cost tokens and hit rate limits. Mock tests catch code errors for free | Mocks can differ from real replies. I added replies from real runs to the eval |
| 9 | n8n as the orchestrator. The project required it | A script in code | The platform was fixed, so the choice was how to work within it: keep logic in tested code nodes and add notes so the flow stays readable | The JSON diffs poorly, and nodes depend on each other by name (failure 3) |
| 10 | Pause nodes and short prompts on free-tier models | Pay for a model with higher limits | Development used free-tier models, so their limits shaped the design | A full run is slow, and runs still fail on limits |
| 11 | Illustrations are labelled as AI-generated and are never analysed as evidence | Treat images as data | Captions and hashtags are the evidence. Pictures are decoration | The image content adds nothing to the counts |
| 12 | The chat request chooses the output: a report, or one brief | Always build everything | Skips the report assembly when a team needs one brief | One more routing step to test |
| 13 | Number checks and claim patterns to filter model text | A second model to judge the first | Deterministic, cheap and testable | It catches what I thought of and misses the rest |

## Decisions I would revisit
- The evidence cut-offs (4 and 5), once there is real data to calibrate against.
- Pattern filters (13), if a quality evaluation showed they miss too much.
- Passing images through every node (failure 4).

## How the evidence level works, with an example
The code counts how many of the 13 sampled posts mention each attribute of a segment, takes the middle value of those counts (the lower middle when there is an even number), and divides by the number of posts. That share sets the level. A segment with no attribute found in any post is `unverified`.

| Share of posts | Level |
|---|---|
| Below 20% | weak |
| 20% up to and including 50% | moderate |
| Above 50% | stronger |

- **"Modern Geometric Abstract"** in an earlier run: modern in 9 posts, geometric in 5, abstract in 4. The middle value is 5, which is 5 of 13, or 38%. That is **moderate**.
- **"Vintage Distressed Floral"**: vintage, floral and distressed in 1 post each. That is 1 of 13, or 8%. That is **weak**.

The 20% and 50% cut-offs are where I chose to draw the lines. I had no real data to calibrate them against, so a different sample size could move a segment from one level to another.
