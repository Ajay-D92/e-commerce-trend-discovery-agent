# Evaluation

Two layers. The first runs today; the second is a template.

## 1. Guardrail eval (runs offline)

`run_guardrail_eval.js` feeds 12 recorded model replies through the `Check Creative Brief` node and checks each decision: what is kept, what is dropped, and which status is reported. No model call is made.

```bash
node eval/run_guardrail_eval.js
```

| Case type | Cases |
|---|---|
| Should be kept | a hedged hypothesis, a number that exists in the data, JSON inside a markdown fence |
| Should be dropped | an invented statistic, "customers love", "demand is", "best-selling", "may prefer", an unknown segment number |
| Should be neutralised | HTML and script tags in a model string |
| Should fail visibly | a reply from a safety classifier ("User Safety: safe"), an empty reply |

The "may prefer" case comes from a real run, where the original filter let it through. With the original pattern the eval reports 11 of 12; with the current pattern it reports 12 of 12. The eval measures the filter only. It says nothing about whether the creative ideas are good.

## 2. Quality eval (template, not yet run)

Run the workflow on a fixed set of inputs and have a person score each marketing brief with `quality_rubric.md`. Repeat after every prompt or model change and compare the averages.

1. Choose 10 fixed requests, for example 3 categories × 3 focus words plus one unusual case.
2. Run each with the model under test and save the marketing brief.
3. Score each brief 1–5 on the five criteria in `quality_rubric.md`.
4. Record the scores in a table in this folder, with the model name and the date.

Results so far: none recorded.
