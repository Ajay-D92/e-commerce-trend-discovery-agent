# Validation plan

How I would test this agent with a real team, with the success and stop criteria written before any run. The thresholds are proposals to agree with the client. I have not validated them.

## Question to answer
Does a brief from this agent help a team decide which styles to test, source or promote, faster and with fewer unsupported claims than their current process?

## Scope
This is a small exploratory pilot, not proof of broader performance. Every threshold below is a proposed target to agree with the client.

## Setup
- **People:** one buyer or sourcing lead, one marketer, one analyst who produces trend reports today.
- **Requests:** 10 fixed requests, for example three categories with three focus words each, and one unusual case.
- **Comparison:** the analyst's current process on the same 10 requests.
- **Data:** the client's own sources where they allow it. If the sources are the same stored snapshot, the results cannot say anything about demand.

## What I would measure
| Measure | How | Proposed success |
|---|---|---|
| Time to a first brief | Stopwatch, agent against analyst | Median under 10 minutes for the agent |
| Usefulness | The rubric in `eval/quality_rubric.md`, scored 1-5 by the buyer and the marketer | At least 7 of 10 briefs score 4 or higher on "usable" and "grounded" |
| Unsupported claims | Read every brief and check each number and claim against the data | None reach a page |
| Decisions (exploratory) | Record each decision beside the brief that informed it | The brief changes or confirms at least 2 of 10 decisions. The baseline is not validated, so I would read this as a signal only |
| Cost | Count model calls and tokens per run | Within a budget the client sets before the pilot |

## Stop criteria
Investigate at once if a single invented number or unsupported preference claim reaches a page. Stop and fix before continuing if any of these happens:
- An invented number or an unsupported preference claim reaches a page in two or more runs.
- The average "grounded" score is below 3.
- Reviewers cannot tell from a brief how strong its evidence is.

## What a positive result would mean
- The briefs are usable and traceable for this team and category.
- Showing that the evidence levels predict demand needs sales or search data.

## Before the pilot
- Agree the success and stop criteria with the client.
- Confirm the terms of use for each data source.
- Record the current manual process, with time, so the comparison is fair.
- Remove any personal data from the inputs.
