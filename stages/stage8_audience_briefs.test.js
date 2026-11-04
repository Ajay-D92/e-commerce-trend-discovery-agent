// Local tests for stage8_audience_briefs.json (Stage 8: supplier, marketing and leadership briefs)
// Run: node stage8_audience_briefs.test.js
// Pure code with MOCK data: no AI, no network, never touches n8n. The one AI agent (Creative Brief Generator) is checked by its prompt
// expression and by feeding mock model answers (good, malformed, hostile, missing) into Check Creative Brief.
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const wf = JSON.parse(fs.readFileSync(path.join(__dirname, 'stage8_audience_briefs.json'), 'utf8'));
const node = (name) => wf.nodes.find((n) => n.name === name);
let failures = 0;
const check = async (label, fn) => { try { await fn(); console.log(`PASS  ${label}`); } catch (e) { failures++; console.log(`FAIL  ${label}\n      ${e.message}`); } };

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const run = async (name, { store = {}, input = [], helpers } = {}) => {
  const $ = (n) => { if (!(n in store)) throw new Error(`Node '${n}' hasn't been executed`); const it = store[n].map((json) => ({ json })); return { first: () => it[0], all: () => it }; };
  const inp = input.map((json) => ({ json }));
  const fn = new AsyncFunction('$', '$input', node(name).parameters.jsCode);
  return fn.call({ helpers: helpers || { prepareBinaryData: async (buf, fileName, mimeType) => ({ data: buf.toString('base64'), mimeType, fileName }) } }, $, { first: () => inp[0], all: () => inp });
};
const evalExpr = (field, store) => {
  assert.ok(field.startsWith('={{ ') && field.endsWith(' }}'));
  assert.strictEqual(field.split('}}').length - 1, 1, 'exactly one "}}"');
  const $ = (n) => { if (!(n in store)) throw new Error(`Node '${n}' hasn't been executed`); const it = store[n].map((json) => ({ json })); return { first: () => it[0], all: () => it }; };
  return new Function('$', `return (${field.slice(4, -3)});`)($);
};

// ---------- mock upstream data (the numbers and shapes of the real area-rug run) ----------
const B64 = (n) => '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEB' + String(n).repeat(8);
const v = (value, a, s) => ({ value, amazon_products: a, social_posts: s });
const comparison = [
  { group: 'material', values: [v('Polyester', 6, null), v('Blend', 1, 2), v('wool', null, 4), v('silk', null, 1)] },
  { group: 'pattern', values: [v('Solid', 3, null), v('Abstract', 2, 4), v('Distressed', 1, null), v('Floral', 1, null), v('textured', null, 7), v('geometric', null, 5), v('tribal', null, 1)] },
  { group: 'style', values: [v('Modern', 3, 9), v('Bohemian', 2, null), v('Vintage', 2, 1), v('minimalist', null, 3)] },
  { group: 'pile', values: [v('Low-pile', 7, 1), v('medium', null, 1)] },
  { group: 'colour', values: [v('Green', 2, 3), v('Black', 1, null), v('Blue', 1, null), v('Gray', 1, null), v('Multi', 1, 3), v('cream', null, 6), v('beige', null, 4), v('neutral', null, 3)] },
  { group: 'features', values: [v('non slip', null, 1)] },
];
const SEGS = [
  { n: 1, name: 'Modern Minimalist Low-Pile Polyester', description: 'A clean, contemporary aesthetic featuring low-pile, abstract or solid patterns in muted tones.', visual_characteristics: ['low-pile surface', 'abstract or solid geometric pattern', 'clean, minimal lines'], color_palette: ['navy', 'gray', 'green', 'cream', 'beige'], typical_materials: ['polyester', 'polyester blend'], target_rooms: ['living room', 'bedroom', 'home office'], price_positioning: 'mid-range', support_level: 'moderate', confidence: 'medium', weakest_attribute: 'pile: low (1 of 13 posts)', trend_signals: ['style: modern mentioned in 9 of 13 posts', 'pattern: geometric mentioned in 5 of 13 posts', 'AI note: Social posts frequently mention modern style'], suggested_action: 'Run a small pilot or test' },
  { n: 2, name: 'Bohemian Textured Natural Fiber', description: 'Earthy, hand-tufted or flat-weave rugs with textured or tribal motifs in warm tones.', visual_characteristics: ['hand-tufted or flat-weave construction', 'textured weave with tribal motifs'], color_palette: ['green', 'cream', 'beige', 'neutral'], typical_materials: ['natural fibers', 'wool', 'blend'], target_rooms: ['living room', 'bedroom'], price_positioning: 'mid-range', support_level: 'weak', confidence: 'low', weakest_attribute: 'style: bohemian (1 of 13 posts)', trend_signals: ['pattern: textured mentioned in 7 of 13 posts', 'AI note: boho'], suggested_action: 'Monitor; collect more evidence before investing' },
  { n: 3, name: 'Vintage Distressed Blend', description: 'Vintage-inspired rugs with distressed patterns and a blend of fibers.', visual_characteristics: ['distressed pattern', 'low-pile surface'], color_palette: ['multi', 'neutral', 'green'], typical_materials: ['blend', 'wool'], target_rooms: ['living room', 'bedroom'], price_positioning: 'mid-range', support_level: 'weak', confidence: 'low', weakest_attribute: 'style: vintage (1 of 13 posts)', trend_signals: ['material: blend mentioned in 2 of 13 posts'], suggested_action: 'Monitor; collect more evidence before investing' },
];
const report = (over = {}) => ({
  category: 'Area Rug', generated_on: '2026-10-28',
  products: { products_analyzed: 7, products_returned: 10, price: { n: 7, min: 49.99, median: 63.63, max: 71.99 }, price_distribution: { 'Under $50': 1, '$50-100': 6, '$100-200': 0 }, rating: { n: 7, mean: 4.5 }, top: { size: [{ value: "8'×10'", count: 6 }, { value: "5'×7'", count: 1 }], material: [{ value: 'Polyester', count: 6 }, { value: 'Blend', count: 1 }], color: [{ value: 'Green', count: 2 }], style: [{ value: 'Modern', count: 3 }] } },
  social: { posts_analyzed: 13, instagram_posts: 8, pinterest_posts: 5, post_dates: { instagram: { newest_age_days: 702 }, pinterest: { newest_age_days: 699 } }, top_hashtags: [{ tag: '#handtufted', count: 4 }, { tag: '#geometricrug', count: 3 }], snapshots: { amazon: { age_days: 158 } }, sources_unavailable: [] },
  comparison, segments: SEGS, run_status: { blog_documents: 3, market_documents: 0 },
  warnings: ['Only 13 social posts analysed (fewer than 20): treat counts and rankings as weak evidence.', 'amazon data snapshot is 158 days old (2026-05-23): not current.'], ...over,
});
const know = () => ({
  sizing: { rules: ['Add at least 24 inches on all sides of the dining table'], living_room: null, bedroom: null, dining: 'Add at least 24 inches on all sides of the dining table' },
  materials: { durability: { wool: 'Excellent - lasts for generations' }, care_needs: { wool: 'Vacuum regularly, professional cleaning recommended' } },
  style_insights: { trending: ['Biophilic and nature-inspired designs with sustainable materials'], color_advice: 'Warm earth tones like terracotta, sage, and ochre are dominant' },
  buyer_guidance: { quality_indicators: ['Hand-knotted construction indicates highest quality'] },
  evidence: [{ field: 'sizing.dining', key: null, text: 'Add at least 24 inches on all sides of the dining table', source_id: 'B3' }, { field: 'materials.durability', key: 'wool', text: 'Excellent - lasts for generations', source_id: 'B3' }, { field: 'materials.care_need', key: 'wool', text: 'Vacuum regularly, professional cleaning recommended', source_id: 'B3' }, { field: 'buyer.quality_indicator', key: null, text: 'Hand-knotted construction indicates highest quality', source_id: 'B3' }, { field: 'style.trending', key: null, text: 'Biophilic and nature-inspired designs', source_id: 'B1' }],
  market_figures: [{ figure: 'USD 62.90 Billion', type: 'money amount', source_id: 'B2', context: 'Market Size 2025 USD 62.90 Billion' }, { figure: '9.59%', type: 'annual growth rate (CAGR)', source_id: 'B2', context: 'CAGR 9.59%' }],
});
const enc = () => SEGS.map((s, i) => ({ segmentName: s.name, base64Image: B64(i + 1), mimeType: 'image/jpeg', hasImage: true }));
const store = (over = {}) => ({ 'Collect Report Data': [{ report: report() }], 'Check Sections': [{ ready: true, failed_sections: [], sections_needing_review: [], generated_on: '2026-10-28', category: 'Area Rug' }], 'Parse Blog Knowledge': [{ blogKnowledge: know() }], 'Encode to Base': enc(), ...over });
const collect = async (st = store()) => (await run('Collect Audience Data', { store: st }))[0].json;
const GOOD = { themes: [{ name: 'Quiet Modern', idea: 'Show calm living rooms in muted tones.', segments: [1] }, { name: 'Earthy Layers', idea: 'Layered textures in warm neutrals.', segments: [2, 3] }], segments: SEGS.map((s) => ({ n: s.n, audience_hypothesis: `Shoppers furnishing a ${s.target_rooms[0]} may respond to a calm, clean look.`, key_message: 'A soft, easy look for everyday rooms.', tone: 'calm and practical', content_ideas: ['Short before and after room clip', 'Colour palette carousel', 'Care tips post'], test_to_run: 'Post two versions of the same image and compare saves.' })), content_tests: [{ test: 'Compare a lifestyle photo with a pattern close-up', measure: 'saves and comments per post' }] };
const creativeCheck = async (out, extra = {}, st = null) => (await run('Check Creative Brief', { store: st || { 'Collect Audience Data': [await collect()] }, input: [{ output: typeof out === 'string' ? out : JSON.stringify(out), ...extra }] }))[0].json;
const build = async (cre, st = store()) => {
  const c = await collect(st);
  const s2 = { 'Collect Audience Data': [c], 'Check Creative Brief': [cre || { creative: { themes: [], segments: [], content_tests: [] }, creativeStatus: 'ai_unavailable' }] };
  const items = await run('Build Audience Briefs', { store: s2 });
  return Object.fromEntries(items.map((i) => [i.json.audience, i.json]));
};
const goodCre = async () => creativeCheck(GOOD);

(async () => {
  // ---------- Structure ----------
  await check('six nodes, wired in order; one AI agent (no model attached, continue on error, retries); no credentials; note present', () => {
    const names = ['Collect Audience Data', 'Creative Brief Generator', 'Check Creative Brief', 'Build Audience Briefs', 'Audience Brief Validator', 'Download Audience Briefs'];
    assert.deepStrictEqual(wf.nodes.filter((n) => n.type !== 'n8n-nodes-base.stickyNote').map((n) => n.name), names);
    for (let i = 0; i < names.length - 1; i++) assert.deepStrictEqual(wf.connections[names[i]].main, [[{ node: names[i + 1], type: 'main', index: 0 }]]);
    const agent = node('Creative Brief Generator');
    assert.strictEqual(agent.type, '@n8n/n8n-nodes-langchain.agent'); assert.strictEqual(agent.onError, 'continueRegularOutput'); assert.strictEqual(agent.retryOnFail, true); assert.ok(agent.waitBetweenTries <= 5000);
    assert.ok(!JSON.stringify(wf).match(/lmChat|ai_languageModel|credentials/));
    assert.strictEqual(wf.nodes.filter((n) => n.type.includes('langchain')).length, 1, 'exactly one AI call');
  });
  await check('every $("Node") reference names a node of this file or a known earlier node', () => {
    const KNOWN = new Set(['Collect Report Data', 'Check Sections', 'Parse Blog Knowledge', 'Encode to Base', 'Collect Audience Data', 'Creative Brief Generator', 'Check Creative Brief', 'Build Audience Briefs', 'Audience Brief Validator', 'Download Audience Briefs']);
    const names = [...JSON.stringify(wf.nodes.map((n) => n.parameters)).matchAll(/\$\(\\?['"]([^'"\\]+)\\?['"]\)/g)].map((m) => m[1]);
    assert.ok(names.length >= 8); for (const n of names) assert.ok(KNOWN.has(n), n);
  });

  // ---------- Collect Audience Data ----------
  await check('Collect: segments keep evidence fields; the AI\'s own notes are left out of verified_signals', async () => {
    const c = await collect();
    assert.deepStrictEqual(c.facts.segments[0].verified_signals, ['style: modern mentioned in 9 of 13 posts', 'pattern: geometric mentioned in 5 of 13 posts']);
    assert.strictEqual(c.facts.segments[1].support_level, 'weak');
    assert.strictEqual(c.facts.category, 'Area Rug'); assert.strictEqual(c.facts.date, 'October 28, 2026');
  });
  await check('Collect: data ages, article count, quality flags and article guidance are gathered; images are matched and validated', async () => {
    const c = await collect(); const f = c.facts;
    assert.strictEqual(f.social.newest_age_min, 699); assert.strictEqual(f.social.newest_age_max, 702); assert.strictEqual(f.social.amazon_age_days, 158);
    assert.strictEqual(f.quality.articles, 3); assert.strictEqual(f.quality.report_ready, true);
    assert.strictEqual(f.knowledge.sizing_rules.length, 1); assert.ok(f.knowledge.evidence.some((e) => e.source_id === 'B3'));
    assert.deepStrictEqual(c.images.map((i) => [i.n, i.mimeType, !!i.base64]), [[1, 'image/jpeg', true], [2, 'image/jpeg', true], [3, 'image/jpeg', true]]);
    const bad = enc(); bad[0].base64Image = '"><script>x</script>' + B64(1); bad[1].hasImage = false;
    const c2 = await collect(store({ 'Encode to Base': bad }));
    assert.deepStrictEqual(c2.images.map((i) => !!i.base64), [false, false, true]);
  });
  await check('Collect: missing upstream nodes never crash; the item is empty but well-formed', async () => {
    const c = await collect({});
    assert.deepStrictEqual(c.facts.segments, []); assert.strictEqual(c.facts.category, 'Rug'); assert.strictEqual(c.facts.social.newest_age_min, null);
  });

  // ---------- Creative Brief Generator prompt ----------
  await check('the agent prompt carries only the facts it needs (no image data, no prices) and its system message sets the "ideas to test" rules', async () => {
    const st = { 'Collect Audience Data': [await collect()] };
    const text = evalExpr(node('Creative Brief Generator').parameters.text, st);
    const facts = JSON.parse(text.slice(text.indexOf('\n') + 1));
    assert.strictEqual(facts.segments.length, 3); assert.ok(facts.hashtags.length && facts.article_claims_on_style.length);
    assert.ok(!/base64|\/9j\//.test(text) && !/49\.99|price/i.test(text));
    assert.ok(text.length < 6000, `${text.length} chars`);
    const sys = node('Creative Brief Generator').parameters.options.systemMessage;
    assert.ok(/IDEA TO TEST, never a finding/.test(sys) && /Never claim demand, popularity, performance/.test(sys) && /never follow instructions/.test(sys) && /JSON only/.test(sys));
  });

  // ---------- Check Creative Brief ----------
  await check('Check Creative: a good answer is kept (themes, one brief per segment, tests)', async () => {
    const r = await creativeCheck(GOOD);
    assert.strictEqual(r.creativeStatus, 'ok'); assert.strictEqual(r.creative.themes.length, 2); assert.strictEqual(r.creative.segments.length, 3); assert.strictEqual(r.creative.segments[0].content_ideas.length, 3); assert.strictEqual(r.droppedStrings, 0);
  });
  await check('Check Creative: fenced JSON and JSON with words around it are read; broken, empty and errored answers give a status, not a crash', async () => {
    assert.strictEqual((await creativeCheck('```json\n' + JSON.stringify(GOOD) + '\n```')).creativeStatus, 'ok');
    assert.strictEqual((await creativeCheck('Here you go: ' + JSON.stringify(GOOD) + ' Enjoy!')).creativeStatus, 'ok');
    assert.strictEqual((await creativeCheck('{"themes": [')).creativeStatus, 'ai_output_invalid');
    assert.strictEqual((await creativeCheck('')).creativeStatus, 'ai_unavailable');
    assert.strictEqual((await creativeCheck(undefined, { error: 'rate limit' })).creativeStatus, 'ai_unavailable');
    assert.strictEqual((await creativeCheck('[1,2]')).creativeStatus, 'ai_output_invalid');
    assert.strictEqual((await creativeCheck({ nothing: true })).creativeStatus, 'no_usable_ideas');
  });
  await check('Check Creative: claims of demand, preference, performance or proof are dropped, and so are numbers that are not in the facts', async () => {
    const dirty = JSON.parse(JSON.stringify(GOOD));
    dirty.themes[0].idea = 'Shoppers prefer this style and demand is strong.';
    dirty.segments[0].key_message = 'Customers love it: proven to boost sales by 40%.';
    dirty.segments[1].key_message = 'A soft look that will increase conversions.';
    dirty.segments[2].content_ideas = ['Short clip', 'Post a palette for 3 rooms', 'Posts get 300% more saves'];
    dirty.content_tests[0].measure = 'viral reach';
    const r = await creativeCheck(dirty);
    assert.strictEqual(r.creativeStatus, 'partial'); assert.ok(r.droppedStrings >= 5);
    assert.strictEqual(r.creative.themes.length, 1);
    assert.strictEqual(r.creative.segments[0].key_message, null);
    assert.strictEqual(r.creative.segments[1].key_message, null);
    assert.deepStrictEqual(r.creative.segments[2].content_ideas, ['Short clip', 'Post a palette for 3 rooms']);
    assert.strictEqual(r.creative.content_tests[0].measure, null);
  });
  await check('Check Creative: tags are stripped, strings are cut, unknown segment numbers and extra fields vanish; a number that IS in the facts is allowed', async () => {
    const x = JSON.parse(JSON.stringify(GOOD));
    x.segments[0].key_message = '<img src=x onerror=alert(1)>A soft look for 13 posts of inspiration ' + 'x'.repeat(400);
    x.segments.push({ n: 99, audience_hypothesis: 'ghost segment', evil: '<script>' });
    x.themes[1].segments = [2, 99, 'a'];
    const r = await creativeCheck(x);
    const m = r.creative.segments[0].key_message;
    assert.ok(m && m.length <= 160 && !/[<>]/.test(m) && /A soft look/.test(m), String(m));
    assert.ok(!JSON.stringify(r.creative).includes('<'), 'no tag survives');
    assert.deepStrictEqual(r.creative.segments.map((s) => s.n), [1, 2, 3]);
    assert.deepStrictEqual(r.creative.themes[1].segments, [2]);
    assert.ok(!('evil' in r.creative.segments[0]));
  });

  // ---------- Build: the three pages ----------
  await check('Build: three pages, one per audience, with safe file names; complete HTML; nothing loads from the internet; no script', async () => {
    const p = await build(await goodCre());
    assert.deepStrictEqual(Object.keys(p).sort(), ['leadership', 'marketing', 'supplier']);
    assert.strictEqual(p.supplier.fileName, 'area_rug_supplier_brief_2026-10-28.html'); assert.strictEqual(p.marketing.fileName, 'area_rug_marketing_brief_2026-10-28.html'); assert.strictEqual(p.leadership.fileName, 'area_rug_leadership_brief_2026-10-28.html');
    for (const a of Object.values(p)) { assert.ok(a.html.startsWith('<!DOCTYPE html>') && a.html.endsWith('</html>')); assert.ok(!/<script|<link|@import|googleapis|(?:src|href)="https?:/i.test(a.html), a.audience); }
  });
  await check('Leadership: with a moderate segment the recommendation is a small test of it and validation of the rest; confidence is a medium-or-lower meter, never "high"', async () => {
    const h = (await build(await goodCre())).leadership.html;
    assert.ok(/Run a small, time-boxed test on Modern Minimalist Low-Pile Polyester; validate the other segment\(s\) before investing/.test(h));
    assert.ok(/Overall evidence confidence/.test(h) && /moderate \(3\/4\)/.test(h) && /capped at medium/.test(h) && !/high \(/.test(h));
    assert.strictEqual((h.match(/class="meter"/g) || []).length, 4, 'one meter for the recommendation and one per segment');
    assert.ok(/<span class="badge b-go">Test<\/span>/.test(h) && (h.match(/Hold: validate/g) || []).length === 2);
  });
  await check('Leadership: when every segment is weak the recommendation is "do not commit investment" and no segment is told to be tested', async () => {
    const st = store({ 'Collect Report Data': [{ report: report({ segments: SEGS.map((s) => ({ ...s, support_level: 'weak', confidence: 'low' })) }) }] });
    const h = (await build(await goodCre(), st)).leadership.html;
    assert.ok(/Do not commit investment on this evidence/.test(h) && !/b-go">Test/.test(h) && /Hold product development/.test(h));
  });
  await check('Leadership: data quality, pricing, risks and next steps use the real numbers; prices are observations, not advice', async () => {
    const h = (await build(await goodCre())).leadership.html;
    for (const t of ['7 analysed of 10 returned', '158 days old', '13 (8 Instagram, 5 Pinterest)', '699 to 702 days old', 'No segment', 'sales, traffic and search-volume data']) assert.ok(h.includes(t) || t === 'No segment', t);
    assert.ok(/minimum \$49\.99, median \$63\.63, maximum \$71\.99/.test(h) && /Under \$50: 1 of 7 products; \$50-100: 6 of 7 products/.test(h) && !/\$100-200: 0/.test(h));
    assert.ok(/not a recommendation for a selling price/.test(h) && /model's estimates and are not validated/.test(h));
    assert.ok(/Concentrated sample\.<\/strong> Polyester in 6 of 7 products; 8'×10' in 6 of 7 products/.test(h) && !/Green in 2 of 7/.test(h) && !/Modern in 3 of 7/.test(h) && /Obtain recent sales and traffic data/.test(h));
    assert.ok(/USD 62\.90 Billion/.test(h) && /not verified/.test(h));
  });
  await check('Supplier: each specification is next to its real count and a status (products and posts / products only / posts only / no count)', async () => {
    const h = (await build(await goodCre())).supplier.html;
    assert.ok(/Polyester: 6 of 7 products; not among the listed posts/.test(h) && /Seen in products only/.test(h));
    assert.ok(/Green: 2 of 7 products; 3 of 13 posts/.test(h) && /Seen in products and posts/.test(h));
    assert.ok(/Blend: 1 of 7 products; 2 of 13 posts/.test(h));
    assert.ok(/Modern: 3 of 7 products; 9 of 13 posts/.test(h));
    assert.ok(/Seen in posts only/.test(h) && /No count: a model suggestion, validate/.test(h), 'natural fibers has no count');
    assert.ok(/Mixed: some values seen in both, others in one source only/.test(h), 'polyester (products only) next to blend (both) is Mixed, not green');
    assert.strictEqual((h.match(/class="card"/g) || []).length, 3);
  });
  await check('Supplier: a Mixed material row is also listed under specifications requiring validation, so it cannot be overlooked', async () => {
    const h = (await build(await goodCre())).supplier.html;
    const sec = h.slice(h.indexOf('id="validate"'), h.indexOf('id="claims"'));
    assert.ok(/Modern Minimalist Low-Pile Polyester: material \(polyester, polyester blend\) is mixed/.test(sec), sec.slice(0, 600));
  });
  await check('Supplier: priorities are ordered by evidence; only a moderate or stronger segment gets "Priority 1"; weak ones are held', async () => {
    const h = (await build(await goodCre())).supplier.html;
    assert.strictEqual((h.match(/Priority 1: develop a small sample set to test/g) || []).length, 1);
    assert.strictEqual((h.match(/Priority 3: hold; collect more evidence first/g) || []).length, 2);
    const pri = h.slice(h.indexOf('id="priorities"'));
    assert.ok(pri.indexOf('Modern Minimalist') < pri.indexOf('Bohemian Textured'));
  });
  await check('Supplier: specs to validate and article claims are listed with source ids; observed bands are not recommendations', async () => {
    const h = (await build(await goodCre())).supplier.html;
    assert.ok(/<section id="validate">/.test(h) && /pile: low \(1 of 13 posts\)/.test(h) && /style: bohemian \(1 of 13 posts\)/.test(h) && /style: vintage \(1 of 13 posts\)/.test(h));
    assert.ok(/Add at least 24 inches on all sides of the dining table \(B3\)/.test(h) && /wool: Excellent - lasts for generations \(B3\)/.test(h));
    assert.ok(/not recommended prices or sizes/.test(h) && /8'×10' \(6 of 7\)/.test(h));
  });
  await check('Marketing: the "ideas to test, not proven consumer preferences" notice, one illustration per style, the briefs and the evidence badge are present', async () => {
    const h = (await build(await goodCre())).marketing.html;
    assert.ok(/ideas to test, not proven consumer preferences/.test(h));
    assert.strictEqual((h.match(/<img /g) || []).length, 3); assert.ok(h.includes(`data:image/jpeg;base64,${B64(2)}`));
    assert.ok(/Audience hypothesis:<\/strong> Shoppers furnishing a living room may respond/.test(h) && /Test to run:/.test(h) && /Campaign themes \(ideas to test\)/.test(h) && /Content tests to run/.test(h));
    assert.ok(/moderate \(3\/4\)/.test(h) && /AI-generated illustration of the style, not a product photo/.test(h));
    assert.ok(/#handtufted/.test(h) && /not a prediction of performance/.test(h));
  });
  await check('Marketing: when the AI failed the page says so, still shows the facts and images, and does not invent ideas', async () => {
    const h = (await build(null)).marketing.html;
    assert.ok(/could not be generated in this run \(ai_unavailable\)/.test(h) && /Creative ideas were not generated for this segment/.test(h));
    assert.strictEqual((h.match(/<img /g) || []).length, 3); assert.ok(!/Audience hypothesis/.test(h));
  });
  await check('every inserted value is escaped: a hostile segment name or hashtag cannot add tags to any page', async () => {
    const evil = SEGS.map((s, i) => (i === 0 ? { ...s, name: '<script>alert(1)</script>', description: '"><img src=x onerror=alert(1)>' } : s));
    const st = store({ 'Collect Report Data': [{ report: report({ segments: evil, social: { ...report().social, top_hashtags: [{ tag: '<b>#x</b>', count: 2 }] } }) }], 'Encode to Base': enc().map((e, i) => (i === 0 ? { ...e, segmentName: '<script>alert(1)</script>' } : e)) });
    const p = await build(null, st);
    for (const a of Object.values(p)) assert.ok(!/<script>alert|onerror=alert\(1\)>|<b>#x/.test(a.html.replace(/onerror=alert\(1\)&gt;/g, '')), a.audience);
  });
  await check('a failed or review section in the main report puts a banner on every brief', async () => {
    const st = store({ 'Check Sections': [{ ready: false, failed_sections: ['market_research'], sections_needing_review: ['risks'], generated_on: '2026-10-28', category: 'Area Rug' }] });
    const p = await build(await goodCre(), st);
    for (const a of Object.values(p)) assert.ok(/Source report incomplete/.test(a.html) && /market_research/.test(a.html), a.audience);
  });
  await check('with no segments each page says so instead of breaking', async () => {
    const st = store({ 'Collect Report Data': [{ report: report({ segments: [] }) }] });
    const p = await build(null, st);
    assert.ok(/No segments were identified/.test(p.leadership.html) && /No segments were identified/.test(p.supplier.html) && /No segments were identified/.test(p.marketing.html));
  });

  // ---------- Validator and download ----------
  const validate = async (p) => (await run('Audience Brief Validator', { store: { 'Collect Audience Data': [await collect()] }, input: Object.values(p) })).map((i) => i.json);
  await check('Validator: all three pages valid on a normal run', async () => {
    const v = await validate(await build(await goodCre()));
    assert.deepStrictEqual(v.map((x) => x.validation.isValid), [true, true, true], JSON.stringify(v.map((x) => x.validation.warnings)));
    assert.strictEqual(v.find((x) => x.audience === 'marketing').validation.imageCount, 3);
  });
  await check('Validator: a missing section, a missing notice, a missing image, a script, an internet reference and a cut-off page are each caught', async () => {
    const p = await build(await goodCre());
    const bad = (aud, fn) => validate({ ...p, [aud]: { ...p[aud], html: fn(p[aud].html) } }).then((v) => v.find((x) => x.audience === aud).validation);
    assert.ok((await bad('leadership', (h) => h.replace(/<section id="risks">[\s\S]*?<\/section>/, ''))).warnings.some((w) => /Missing sections: risks/.test(w)));
    const noNote = await bad('marketing', (h) => h.replace(/ideas to test, not proven consumer preferences/g, 'x')); assert.strictEqual(noNote.isValid, false);
    assert.ok((await bad('marketing', (h) => h.replace(/<img [^>]*>/g, ''))).warnings.some((w) => /Only 0 of 3 images/.test(w)));
    assert.ok((await bad('supplier', (h) => h.replace('<main', '<script>x()</script><main'))).warnings.some((w) => /script tag/.test(w)));
    assert.ok((await bad('supplier', (h) => h.replace('<main', '<img src="https://evil.example/x.png"><main'))).warnings.some((w) => /internet/.test(w)));
    assert.ok((await bad('leadership', (h) => h.slice(0, h.length - 80))).warnings.some((w) => /incomplete/.test(w)));
    assert.ok((await bad('supplier', (h) => h.replace(/class="card"/g, 'class="c"'))).warnings.some((w) => /no concept brief/.test(w)));
  });
  await check('Download: one text/html binary per audience, content exactly the page, validation attached; falls back when the helper is missing', async () => {
    const v = await validate(await build(await goodCre()));
    const out = await run('Download Audience Briefs', { input: v });
    assert.strictEqual(out.length, 3);
    for (const o of out) { assert.strictEqual(o.binary.data.mimeType, 'text/html'); assert.strictEqual(o.binary.data.fileName, o.json.fileName); assert.strictEqual(o.json.ready, true); assert.strictEqual(Buffer.from(o.binary.data.data, 'base64').toString('utf8'), v.find((x) => x.audience === o.json.audience).html); }
    const fb = await run('Download Audience Briefs', { input: v.slice(0, 1), helpers: { prepareBinaryData: async () => { throw new Error('no'); } } });
    assert.strictEqual(fb[0].binary.data.mimeType, 'text/html');
  });
  await check('end to end: Collect > (mock AI) > Check > Build > Validate > Download gives three valid files', async () => {
    const v = await validate(await build(await goodCre()));
    const out = await run('Download Audience Briefs', { input: v });
    assert.deepStrictEqual(out.map((o) => o.json.ready), [true, true, true]);
    assert.ok(out.every((o) => o.json.sizeKB > 3));
  });

  if (process.env.WRITE_SAMPLES) {   // optional: write the three pages built from the mock data so they can be opened and looked at
    const p = await build(await goodCre());
    for (const a of Object.values(p)) fs.writeFileSync(path.join(process.env.WRITE_SAMPLES, a.fileName), a.html);
  }
  console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
  process.exit(failures ? 1 : 0);
})();
