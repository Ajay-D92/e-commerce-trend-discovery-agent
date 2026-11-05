# Risks, limits and open questions

Six risks that could make the agent unreliable, expensive or hard to maintain, and what I do not yet know about the data. Status: **Addressed**, **Partly addressed** or **Open**.

| # | Risk | Status | What the repository does | What remains |
|---|---|---|---|---|
| 1 | Data provenance, freshness and dependence on one source | Open | The data is a stored snapshot with its dates shown on every page | No second source, no confirmed collection date, no check that the endpoint still works |
| 2 | Service reliability: model rate limits, outages and many API dependencies | Partly addressed | Pause nodes, short prompts, token limits, retries, continue-on-error on 12 of 13 agents, and a visible failure status | No fallback model, no monitoring and no alert when a run fails |
| 3 | Unsupported claims and incomplete validation | Partly addressed | JSON-only replies, number checks, article-quote checks, claim filters, 318 checks and a 12-case guardrail eval | The filters are pattern lists and cannot prove nothing slips through (see failure 8) |
| 4 | Category classification accuracy | Partly addressed | A judging step, a fixed attribute vocabulary and tests | Accuracy is not measured |
| 5 | Weak trend evidence: captions and hashtags may misdescribe an image, and popularity is not growth | Partly addressed | Images are not used as evidence, evidence is rated and capped at medium, and the pages say nothing measures demand | One snapshot only. Showing growth needs data from several dates |
| 6 | Usefulness: report length and whether real users act on the briefs | Open | Separate supplier, marketing and leadership briefs, each with an evidence level | Not tested with real readers |

## The risk I weigh most
A confident recommendation built on incomplete, old or unchecked data. The design responds by stating the evidence level and the limits next to every recommendation, and by reporting missing sources as missing. A person still has to check the findings before anyone acts on them.

## Data provenance and open questions

The social, blog and market signals come from a curated dataset supplied to stand in for a third-party trend data provider. Scraping those platforms directly breaks their terms. The data is a stored snapshot, and some of it looks curated.

| Question | Status | What the workflow does |
|---|---|---|
| How was the snapshot collected, and how often is it refreshed? | Open | Every page states the age of the newest post and warns when it is older than 180 days |
| How were the social posts selected? | Open | Nothing. The README calls the data a stored snapshot |
| Why did a request for 20 posts per source return 8 Instagram and 5 Pinterest posts? | Open | The sample size is stated on every page |
| Is engagement comparable between Instagram and Pinterest? | Handled in part | Rankings are weighted per source and labelled as weak evidence |
| Do the blog and market-data requests return the same articles? | Open | Both are read and merged, and figures are labelled as reported by the article |
| What are the terms of use, and does the data contain personal details? | Handled in part | Links, emails and phone numbers are removed from captions. The licence question is open |
| Is there any sales or demand data? | Open | No. Nothing in the agent measures demand, and every brief says so |
| How accurate is the category judging, given overlaps such as shag and washable styles in area-rug results? | Open | A judging step and a keyword check filter products. Accuracy is not measured |
| What does a good result look like? | Open | I wrote my own rubric in `eval/quality_rubric.md`, and it has not been run |

Analysing images with a vision model is a possible improvement and not part of this project. The agent reads captions and hashtags only.
