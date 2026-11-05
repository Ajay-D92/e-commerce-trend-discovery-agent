# Reflection

This agent has not been tested with a client or against real sales, so there are no results to show. This page records what I learned, what I would improve next, and what I do not know yet.

## What I learned
- **Compute what can be computed.** A model filed a comparison under the wrong heading when the code could have counted it exactly (failure 5).
- **A filter built from known phrases misses new ones.** "Shoppers may prefer" got through until I saw it in a real run (failure 8).
- **The model is part of the system.** A router returned a safety classifier's answer, and a reasoning model returned nothing on a small token limit (failures 2 and 6).
- **A wrapper that hides errors also hides causes.** Silent lookups made a renaming problem hard to see (failure 3).
- **A test fixture needs one source.** Pins from two runs looked like a product bug (failure 9).
- **Most of the bugs were in the code around the model.**

## What I would improve next
1. Add a quality evaluation: score fixed requests with the rubric in `eval/` before and after every prompt or model change.
2. Add a fallback model, and a person-review step before a brief goes out.
3. Measure cost and run time. The README's "about 14 model calls" is an estimate.
4. Pass image references between nodes instead of image data.

## What I do not know yet
- **Whether the evidence cut-offs are right.** The 20% and 50% lines are my judgment, and I had no real data to calibrate them against (see the design decisions).
- **Whether counting mentions says anything about buying.** A hashtag or caption is a weak signal.
- **How well the filters generalise.** They caught the cases I tried and missed one I had not.
- **Whether the three briefs match what real teams need.** I wrote them from my own reading of what a supplier, a marketer and a leader would ask.

## What this project does not show
- Results from real users, real sales or real traffic.
- Whether the evidence levels predict demand.
- Performance at volume, or with a live data feed.
- Robustness against a determined attempt to manipulate the source text. The Stage 8 tests include hostile input, but I have not red-teamed the whole workflow.
