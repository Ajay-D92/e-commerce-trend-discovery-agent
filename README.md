Retail Trend Discovery Agent



An n8n agent that turns a one-line chat request into a trend report, or into a brief written for one team.

You type:   area rug brief for marketing
You get:    a marketing brief (HTML) with trend segments, evidence levels,
            creative ideas to test, and AI-generated illustrations

Built by Ajay Dhankar. Status: a working prototype on a stored data snapshot. It has not been tested with real users or against real sales.

Start here: sample reports · thinking and reflection

What it helps solve

Retail teams that decide which styles to test, source or promote read product listings, social posts and trade articles by hand, in separate places. The result is slow, hard to repeat, and hard to check. One report rarely serves every reader: a supplier needs specifications and counts, marketing needs ideas to test, and leadership needs a decision and a clear view of how strong the evidence is.

The agent addresses that in one run:





It collects products, social posts and articles together.



It counts how often each style, material, colour and pattern appears, so the evidence is visible.



It rates each trend as stronger, moderate, weak or unverified, and caps its confidence at medium.



It writes a separate brief for sourcing, marketing and leadership from the same facts. The supplier and leadership briefs are written by code from the verified facts, and only the marketing ideas come from a model.



It states what it cannot tell: there is no sales data, and the sample is small and dated.



What the outcome could look like

This has not been tested with real users or against real sales. The example below comes from the sample run, and the table lists what a pilot would measure.

Worked example (the marketing brief in samples/, built from 8 products, 13 social posts and 3 articles):





Three trend segments came out. One, "Modern Textured Low-Pile", has moderate evidence, and the brief suggests a small pilot or test.



Two others, "Vintage Medallion Low-Pile" and "Bohemian Geometric Low-Pile", have weak evidence, and the brief says to monitor them and collect more evidence before investing.



Each segment comes with a hypothesis, content ideas and a test to run, all phrased as things to try.



The page states that the posts are old and few, and that nothing in it measures demand.

What a pilot would measure (hypotheses; there are no results yet):







Possible outcome



How to test it





A first trend brief within minutes



Time the agent against an analyst's manual process on the same category





Briefs a buyer or marketer would act on



Have 3-5 users score them with the rubric in eval/





Decisions confirmed or changed by the brief



Log each decision next to the brief that informed it





Fewer unsupported claims reaching a page



Count dropped strings and incidents; run the guardrail eval

To run a pilot I would need the team's data sources and their terms of use, three users (a buyer, a marketer and an analyst), and a baseline of how they do this today. I make no claim about revenue, demand or forecast accuracy.

What you can ask it







Chat request



What comes back





area rug



Full trend report





area rug brief for marketing



Marketing and creative brief only





supplier brief for shag rug



Supplier and product-development brief only





leadership brief for area rug



Leadership decision brief only





area rug briefs



All three briefs

Supported categories: area rug, outdoor rug, hallway runner, shag rug. An optional focus: washable narrows the search.

Every result is a standalone HTML file with its own validation block (isValid, warnings, image count).

Sample output





[samples/marketing_brief_area_rug.html](samples/marketing_brief_area_rug.html): marketing brief with embedded illustrations



[samples/trend_report_area_rug.html](samples/trend_report_area_rug.html): full trend report

Download and open them in a browser. GitHub shows HTML files as text.

The data, and its limits

The Instagram, Pinterest and blog signals come from a curated dataset supplied to stand in for a third-party trend data provider. Scraping those platforms directly breaks their terms and gets blocked quickly. The data is therefore a stored snapshot, not a live feed, and some of it looks curated.







What



Detail





Social posts



13 posts (8 Instagram, 5 Pinterest), dated 12 to 28 November 2024





Product listings



Up to 10 Amazon listings per run, 6 to 9 kept after filtering, scraped on 23 May 2026





Articles



3 blog articles





Collection date of the snapshot



Not confirmed. How it was collected and how often it is refreshed is still being checked

Because of this, every brief states the age and size of the data, caps its confidence at medium, and makes no claim about demand.

The eight stages

workflow.json is the complete workflow (75 working nodes, plus sticky notes). stages/ holds each stage as its own workflow, with a local test suite where one exists.







Stage



What it does



File in stages/



Checks





1. Input and routing



Reads the category, an optional focus and the brief type; rejects unsupported requests



stage1_input_and_routing



61





2A. Amazon products



Fetches products and reshapes them



stage2a_amazon_products



18





2B. Social, blog and market data



Fetches Instagram, Pinterest, blog and market data; cleans captions and hashtags; checks post dates



stage2b_social_blog_market_data



59





3. Classify and find trends



Judges which products belong to the category, standardises attributes, builds trend segments with counted evidence



stage3_classify_and_trends



63





4. Illustrations



Writes an image prompt per segment, generates the image, encodes it



stage4_illustrations



none (tested through the full workflow)





5. Report sections



Extracts article knowledge, writes seven report sections with one model call each, checks every section



stage5_report_sections



69





6. Routing



The Brief requested? check sends brief requests to Stage 8 and all others to Stage 7



in workflow.json



none (tested through the full workflow)





7. Final report



Assembles and validates the HTML report



stage7_final_report



21





8. Audience briefs



Builds the three briefs: supplier and leadership by code from the verified facts, marketing ideas by a model whose output code filters



stage8_audience_briefs



27

flowchart LR
  A[Chat request] --> B[1. Parse request]
  B --> C[2. Fetch data]
  C --> D[3. Classify and find trends]
  D --> E[4. Illustrations]
  E --> F[5. Report sections]
  F --> G{6. Brief requested?}
  G -- no --> H[7. Final report]
  G -- yes --> I[8. Audience briefs]

The workflow has 13 AI agents, 25 JavaScript code nodes, 5 data fetches, one image-generation call and wait nodes that keep free-tier models inside their rate limits. The stage files in stages/ are earlier standalone versions. The Stage 8 file does not include the chat routing or the later wording fixes, which are in workflow.json.

The code decides, the model writes





Facts come from code. Counts, prices, shares and "how many of 13 posts mention this" are calculated, never written by a model.



The model returns structured JSON only. Raw model text never goes straight into a page.



Every model string is checked. Anything containing a number that is not in the data, or a claim like "proven", "popular" or "customers prefer", is dropped.



Article claims must quote the article. A claim is kept only if its supporting quote appears in the stored article text.



Evidence is counted. For each trend segment the code takes the middle count of posts that mention its attributes and divides it by the number of posts. Below 20% is weak, 20% to 50% is moderate, above 50% is stronger, and a segment with no matching attribute is unverified. These cut-offs are my judgment and are not validated. Confidence stops at medium.



Failures are visible. If a model call fails, the result says so (ai_unavailable, ai_output_invalid) and validation fails. The page never fills the gap with made-up content.



Every page states its limits: sample size, data age and missing sales data.

These checks are patterns and counts. They missed "shoppers may prefer" until I saw it in a real run, so they reduce the risk of unsupported claims and do not remove it.

Tools and skills







Tool or technique



Used for





n8n



Orchestrating 75 working nodes: routing, retries, waits, branching





LLM agents (Groq and OpenRouter models)



Classifying products, naming trend segments, writing report sections and creative ideas





Image generation (FLUX.1 schnell on Cloudflare Workers AI)



One illustration per trend segment





Prompt design



JSON-only replies, scraped text labelled as untrusted data, rules against invented numbers





JavaScript



25 code nodes for parsing, counting, validation and building the HTML pages





Validation and guardrails



Number checks, claim filters, article-quote checks, visible failure statuses





Testing and evals



318 stage checks on mock data and a 12-case guardrail eval





REST APIs



Fetching product, social and article data over HTTP, with bearer-token auth for image generation





GitHub Actions



Running the tests on every push



Tests

Each stage was built and tested on its own with mock data before it joined the next. The tests need no AI, no network and no n8n.

318 checks across 7 suites, all passing, plus a 12-case guardrail eval. GitHub runs them on every push. Run any suite from the stages/ folder:

cd stages && node stage8_audience_briefs.test.js

The Stage 8 suite feeds the model-output checker good, malformed, hostile and missing answers to confirm none reaches a page unfiltered. The guardrail eval in eval/ replays 12 model replies through the same checker (some from real runs, some I wrote), including one that slipped through in a real run. eval/ also holds a scoring rubric for the quality of the briefs, which has not been run yet.

Problems I hit and how I solved them

These are selected examples. The full list, with evidence, is in docs/failures.md.





AI failures that still passed validation. When a model call hit a token limit, the marketing page could still pass. The validator now reads the AI status and fails the marketing item when no ideas were generated.



A model router that answered with the wrong kind of model. One run was answered by a safety classifier ("User Safety: safe"), which gave unusable output. Naming a specific instruct model fixed it.



Silent failures after renaming nodes. Code nodes look up other nodes by exact name. Pasting into an existing workflow added a 1 to every name, so lookups returned empty data with no error. Importing into an empty workflow fixed it.



"Existing execution data is too large." n8n refuses to run a single node when base64 images are repeated across nodes. I tested later stages from small pinned data and kept images out of the pins.



Wrong comparisons from the model. It filed "low-pile" (7 of 7 products and 1 of 13 posts) under "only among Amazon values". The code now writes the comparison sentences and the model copies them.



Empty answers from reasoning models on small token limits. A non-reasoning model fixed it.



Cut-off and garbled text. Claims clipped at 40 characters and raw article snippets with broken spacing were fixed by raising the limit and showing only the figure and its source.



A gap in the claims filter. "Shoppers may prefer" slipped past a pattern that only caught "shoppers prefer". I found it in a real run and tightened the prompt and the pattern.



Thinking and reflection

I could not test this agent with a client or against real sales, so the repository records the reasoning as well as the build.







Document



What it holds





docs/design-decisions.md



13 decisions, each with the alternative I rejected and what it costs, plus a worked example of the evidence levels





docs/failures.md



Nine things that went wrong, with evidence and the fix, plus one guardrail that worked





docs/reflection.md



What I learned, what I would improve next, and what I do not know yet





docs/validation-plan.md



How I would test it with a real team, with proposed success and stop criteria written in advance





docs/risks.md



Six risks with their status, and the open questions about the data



Run it yourself





In n8n, create a new empty workflow, then use Import from file and choose workflow.json.



Create credentials for Groq, OpenRouter and the image-generation API (bearer token). The repository stores no keys, so n8n asks you to pick credentials on each model node.



Replace two placeholders: YOUR-DATA-API-HOST in the five fetch nodes (your product and trend data source) and YOUR_CLOUDFLARE_ACCOUNT_ID in the image node.



On the model nodes, choose a specific model. If a node uses the openrouter/free router or the placeholder CHOOSE-A-NAMED-INSTRUCT-MODEL, replace it: a router can send the request to a model that breaks the JSON output.



Open the chat and send a request from the table above. A full run makes about 14 model calls (an estimate, not a measurement).



Limits





The data is a small, dated snapshot: 13 social posts and a handful of products. Evidence levels are low to moderate.



No sales, traffic or search data was available, so nothing here measures demand. Every brief says so.



Stages 4 and 6 have no standalone tests, and the stage tests predate the chat routing and the last wording fixes.



There is no fallback model, no person-review step before a brief goes out, and no measured cost or run time.



Next steps: connect sales and search-volume data, add a live social source, add a fallback model, label market figures more clearly, and add an automatic check that every number on a page appears in the data.



Repository layout

workflow.json        The complete workflow (import into n8n)
stages/              Each stage as its own workflow, plus its test suite
docs/                Design decisions, failures, reflection, validation plan, risks
eval/                Guardrail eval and a quality rubric
samples/             Example outputs
.github/workflows/   Runs the tests on every push

Licensed under MIT (see LICENSE).
