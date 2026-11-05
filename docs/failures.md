# Failures and what they taught me

Nine things went wrong while building and running this agent, plus one guardrail that worked. Each entry gives what happened, how I noticed, the evidence, the fix and what I took from it.

## 1. The validator ignored a failed AI step (found in review)
- **What happened:** the validator checked the page structure (sections, images, no scripts) and ignored whether the AI had produced any ideas. If the model failed, the marketing page said "the ideas could not be generated", and the validator still marked it valid.
- **How I noticed:** reading the validator code. No failed run triggered it.
- **Evidence:** the validator did not refer to `creativeStatus`, the field that records whether the AI step worked.
- **Fix:** the validator now reads that status. Any status other than `ok` adds a warning, and a failed or unusable reply fails the marketing item.
- **Lesson:** a check that confirms a page is well formed says nothing about whether it is useful.

## 2. The model router answered with the wrong kind of model
- **What happened:** one run returned `ai_output_invalid`.
- **How I noticed:** the raw reply was `"User Safety: safe"`, with 907 prompt tokens and 144 completion tokens.
- **Evidence:** a safety classifier had answered a writing request.
- **Fix:** name a specific instruct model on the node. The two OpenRouter nodes in the export now carry a placeholder that must be replaced.
- **Lesson:** a router that picks a model for you makes the output depend on a choice you cannot see.

## 3. Renamed nodes broke lookups without an error
- **What happened:** after pasting the workflow into one that already had the same node names, every new node got a `1` suffix, and code that reads other nodes by name found nothing.
- **How I noticed:** `Collect Audience Data1` in the editor, and empty `facts`.
- **Fix:** import into a new, empty workflow. Wrapper functions return empty data when a lookup fails, so the failure was silent.
- **Lesson:** a safety wrapper that hides an error also hides the cause. A lookup that fails should say which node was missing.

## 4. "Existing execution data is too large"
- **What happened:** n8n refused to run one node after a full run.
- **Evidence:** the same message each time, caused by base64 images repeated across nodes.
- **Fix:** test later stages from small pinned data, keep images out of the pins, or run the whole workflow.
- **Lesson:** carrying large binary data through every node limits how a workflow can be tested.

## 5. The model wrote a wrong comparison
- **What happened:** it filed "low-pile" under "only among Amazon values" when the data showed 7 of 7 products and 1 of 13 posts.
- **How I noticed:** comparing the generated sentence with the counts.
- **Fix:** the code now writes the comparison sentences, and the model only copies them.
- **Lesson:** where the answer can be computed, compute it.

## 6. Reasoning models returned empty text
- **What happened:** with a small token limit, `openai/gpt-oss-20b` returned an empty string.
- **Evidence:** `"text": ""` with `finish_reason: "length"`.
- **Fix:** a non-reasoning model (`qwen/qwen3.8-27b` worked) and shorter prompts.
- **Lesson:** a model that spends its tokens on hidden reasoning can leave nothing for the answer.

## 7. Claims were cut mid-word
- **What happened:** durability claims appeared as "silk: Low-traffic areas, formal spaces, as acc".
- **Cause and fix:** a hard 40-character limit in the knowledge parser, now 120. A length limit on model output needs a test with a realistic sentence.

## 8. The claims filter missed a hedged preference claim
- **What happened:** "Modern living room shoppers may prefer low-pile rugs" passed with `droppedStrings: 0`.
- **How I noticed:** reading a real marketing brief.
- **Cause:** the pattern caught "shoppers prefer" but not "shoppers may prefer".
- **Fix:** the pattern allows up to two words in between. The guardrail eval has this case: 11 of 12 pass with the old pattern, 12 of 12 with the new one.
- **Lesson:** a filter built from known phrases will miss new ones. This one needed a test case from real output.

## 9. Test data from two different runs
- **What happened:** the briefs said 7 products while the report said 6, and the briefs rated one segment "moderate" while the report rated all of them "weak".
- **Cause:** I pinned the data of different nodes from different runs.
- **Fix:** pin every input from one run.
- **Lesson:** a test fixture needs a single source, or the mismatch looks like a product bug.

## A guardrail that worked
In the area-rug report, two sections wrote the age of the social posts as "700 days". The real figures were 702 and 699. The number check flagged "Numbers not found in the facts: 700", marked the report `ready: false`, and every brief showed a "source report incomplete" banner.
