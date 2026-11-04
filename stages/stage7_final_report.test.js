// Local tests for stage7_final_report.json (Stage 7: collect, assemble, validate, download)
// Run: node stage7_final_report.test.js
// Pure code: no AI, no network, never touches n8n.
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const wf = JSON.parse(fs.readFileSync(path.join(__dirname, 'stage7_final_report.json'), 'utf8'));
const node = (name) => wf.nodes.find((n) => n.name === name);
let failures = 0;
const check = async (label, fn) => {
  try { await fn(); console.log(`PASS  ${label}`); }
  catch (e) { failures++; console.log(`FAIL  ${label}\n      ${e.message}`); }
};

// ---------- mock n8n runtime (async, with this.helpers) ----------
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const run = async (name, { store = {}, input = [], helpers } = {}) => {
  const $ = (n) => {
    if (!(n in store)) throw new Error(`Node '${n}' hasn't been executed`);
    const items = store[n].map((json) => ({ json }));
    return { first: () => items[0], all: () => items };
  };
  const inputItems = input.map((json) => ({ json }));
  const $input = { first: () => inputItems[0], all: () => inputItems };
  const fn = new AsyncFunction('$', '$input', node(name).parameters.jsCode);
  return fn.call({ helpers: helpers || { prepareBinaryData: async (buf, fileName, mimeType) => ({ data: buf.toString('base64'), mimeType, fileName }) } }, $, $input);
};

// ---------- mock data shaped like the real Check Sections / Collect Report Data / Encode to Base outputs ----------
const B64 = (n) => '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEB' + String(n).repeat(8);
const SECTION_HTML = {
  executive_summary: '<h2>Executive Summary</h2><ul><li>Area Rug category, 7 products and 13 posts analyzed.</li></ul>',
  scope: '<h2>Scope of Research</h2><p>This report covers the <strong>Area Rug</strong> category.</p>',
  market_research: '<h2>Market and Customer Insights</h2><p>An article reports a 2025 market size of USD 62.90 Billion (B2).</p>',
  category: '<h2>Category Deep Dive and Sizing</h2><table><thead><tr><th>Size</th><th>Products</th></tr></thead><tbody><tr><td>8\'×10\'</td><td>6</td></tr></tbody></table>',
  attributes: '<h2>Attribute and Assortment Analysis</h2><table><tr><td>pile</td><td>Low-pile</td><td>7</td><td>1</td></tr></table>',
  visual_trends: '<h2>Visual Trend Story</h2><p>The images below are AI-generated.</p><h3>Modern Minimalist</h3><p>Clean look.</p><p>[[IMAGE_1]]</p><p>Caption one.</p><h3>Bohemian</h3><p>Earthy.</p><p>[[IMAGE_2]]</p><p>Caption two.</p><h3>Vintage</h3><p>Distressed.</p><p>[[IMAGE_3]]</p><p>Caption three.</p>',
  risks: '<h2>Risks and Watchouts</h2><ul><li><strong>Old data.</strong> 702 days old.</li></ul>',
  recommendations: '<h2>Demand Signals and Recommendations</h2><p>Demand is not measured.</p>',
};
const ORDER = ['executive_summary', 'scope', 'market_research', 'category', 'attributes', 'visual_trends', 'risks', 'recommendations'];
const checkedOut = (over = {}) => ({
  category: 'Area Rug', generated_on: '2026-10-28', section_order: ORDER, report_sections: { ...SECTION_HTML },
  section_status: Object.fromEntries(ORDER.map((k) => [k, 'ok'])), section_notes: {}, failed_sections: [], sections_needing_review: [],
  image_plan: [1, 2, 3].map((n) => ({ n, has_image: true, placed_in_text: true })), data_warnings: ['old data'], ready: true, ...over,
});
const SEGS = [{ n: 1, name: 'Modern Minimalist Low-Pile Polyester' }, { n: 2, name: 'Bohemian Textured Natural Fiber' }, { n: 3, name: 'Vintage Distressed Blend' }];
const encodeItems = () => SEGS.map((s, i) => ({ segmentName: s.name, base64Image: B64(i + 1), mimeType: 'image/jpeg', hasImage: true }));
const store = (over = {}) => ({ 'Check Sections': [checkedOut()], 'Collect Report Data': [{ report: { segments: SEGS, category: 'Area Rug' } }], 'Encode to Base': encodeItems(), ...over });
const collected = async (st = store()) => (await run('Collect All Sections', { store: st }))[0].json;
const assembled = async (c) => (await run('Assemble HTML Report', { input: [c] }))[0].json;

(async () => {
  // ---------- Structure ----------
  await check('four Code nodes with the course names, wired in order; note present; no AI model, no credentials', () => {
    assert.deepStrictEqual(wf.nodes.filter((n) => n.type !== 'n8n-nodes-base.stickyNote').map((n) => n.name), ['Collect All Sections', 'Assemble HTML Report', 'Section Validator1', 'Download Final Report']);
    for (const n of wf.nodes.filter((x) => x.type === 'n8n-nodes-base.code')) { assert.strictEqual(n.typeVersion, 2); assert.strictEqual(n.parameters.mode, 'runOnceForAllItems'); }
    assert.deepStrictEqual(wf.connections['Collect All Sections'].main, [[{ node: 'Assemble HTML Report', type: 'main', index: 0 }]]);
    assert.deepStrictEqual(wf.connections['Assemble HTML Report'].main, [[{ node: 'Section Validator1', type: 'main', index: 0 }]]);
    assert.deepStrictEqual(wf.connections['Section Validator1'].main, [[{ node: 'Download Final Report', type: 'main', index: 0 }]]);
    assert.ok(!JSON.stringify(wf).match(/lmChat|ai_languageModel|credentials/));
  });
  await check('every $("Node") reference names a node of this file or a known Stage 5 node', () => {
    const KNOWN = new Set(['Check Sections', 'Collect Report Data', 'Encode to Base', 'Collect All Sections', 'Assemble HTML Report', 'Section Validator1', 'Download Final Report']);
    const names = [...JSON.stringify(wf.nodes.map((n) => n.parameters)).matchAll(/\$\(\\?['"]([^'"\\]+)\\?['"]\)/g)].map((m) => m[1]);
    assert.ok(names.length >= 5);
    for (const n of names) assert.ok(KNOWN.has(n), n);
  });

  // ---------- Collect All Sections ----------
  await check('Collect: takes the cleaned sections, order, status and notes from Check Sections; metadata and date are right', async () => {
    const c = await collected();
    assert.deepStrictEqual(c.order, ORDER);
    assert.strictEqual(c.sections.scope, SECTION_HTML.scope);
    assert.strictEqual(c.ready, true);
    assert.deepStrictEqual(c.metadata, { category: 'Area Rug', date: 'October 28, 2026', isoDate: '2026-10-28' });
  });
  await check('Collect: images are matched to segments by name (any order) and by position; the image type comes from the data', async () => {
    const items = encodeItems().reverse();
    items[0] = { ...items[0], mimeType: 'image/png' };
    const c = await collected(store({ 'Encode to Base': items }));
    assert.deepStrictEqual(c.images.map((i) => [i.n, i.name, i.mimeType, !!i.base64]), [[1, SEGS[0].name, 'image/jpeg', true], [2, SEGS[1].name, 'image/jpeg', true], [3, SEGS[2].name, 'image/png', true]]);
    const byPos = await collected(store({ 'Encode to Base': encodeItems().map((e, i) => ({ ...e, segmentName: 'renamed ' + i })) }));
    assert.ok(byPos.images.every((i) => i.base64));
  });
  await check('Collect: a failed image, bad base64, an unknown image type, a missing Encode node: none crash and none is embedded as junk', async () => {
    const items = encodeItems(); items[1] = { ...items[1], hasImage: false, base64Image: null }; items[2] = { ...items[2], base64Image: '"><script>alert(1)</script>' + B64(3), mimeType: 'text/html' };
    const c = await collected(store({ 'Encode to Base': items }));
    assert.strictEqual(c.images[0].base64 !== null, true);
    assert.strictEqual(c.images[1].base64, null);
    assert.strictEqual(c.images[2].base64, null);
    const none = await collected(store({ 'Encode to Base': undefined }));
    assert.ok(none.images.every((i) => i.base64 === null));
    const weird = await collected(store({ 'Encode to Base': encodeItems().map((e) => ({ ...e, mimeType: 'application/x-evil' })) }));
    assert.ok(weird.images.every((i) => i.mimeType === 'image/jpeg'));
  });
  await check('Collect: with no Check Sections at all it still returns an item (empty sections, default order)', async () => {
    const c = await collected({ 'Collect Report Data': [{ report: { segments: SEGS } }] });
    assert.deepStrictEqual(c.sections, {});
    assert.deepStrictEqual(c.order, ORDER);
    assert.strictEqual(c.ready, false);
  });

  // ---------- Assemble HTML Report ----------
  await check('Assemble: a complete page, sections in order, each in its own <section>, title and header escaped', async () => {
    const c = await collected(store({ 'Check Sections': [checkedOut({ category: '<img src=x onerror=alert(1)>' })] }));
    const { cleanedHtml: h } = await assembled(c);
    assert.ok(h.startsWith('<!DOCTYPE html>') && h.endsWith('</html>'));
    const ids = [...h.matchAll(/<section id="([a-z_]+)">/g)].map((m) => m[1]);
    assert.deepStrictEqual(ids, ORDER);
    assert.ok(!/<img src=x/.test(h) && /&lt;img src=x onerror=alert\(1\)&gt; Trend Report/.test(h));
  });
  await check('Assemble: [[IMAGE_n]] tokens become embedded images with the right type; no token and no <p> shell is left; captions escape the segment name', async () => {
    const c = await collected();
    c.images[1].mimeType = 'image/png';
    c.images[2].name = 'Vintage "<b>Blend</b>"';
    const { cleanedHtml: h, imagesPlaced } = await assembled(c);
    assert.strictEqual(imagesPlaced, 3);
    assert.strictEqual((h.match(/<img /g) || []).length, 3);
    assert.ok(h.includes(`data:image/jpeg;base64,${B64(1)}`) && h.includes(`data:image/png;base64,${B64(2)}`));
    assert.ok(!/\[\[IMAGE_/.test(h) && !/<p>\s*<figure/.test(h));
    assert.ok(/Vintage &quot;&lt;b&gt;Blend&lt;\/b&gt;&quot;/.test(h) && !/<b>Blend/.test(h));
    assert.ok(h.indexOf('Caption one') > h.indexOf('data:image/jpeg;base64,' + B64(1)));
  });
  await check('Assemble: an image whose token the model forgot is added at the end of the Visual Trend Story, so no image is lost', async () => {
    const st = store({ 'Check Sections': [checkedOut({ report_sections: { ...SECTION_HTML, visual_trends: '<h2>Visual Trend Story</h2><p>Only text, no tokens.</p>' } })] });
    const { cleanedHtml: h, imagesPlaced } = await assembled(await collected(st));
    assert.strictEqual(imagesPlaced, 3);
    assert.strictEqual((h.match(/<img /g) || []).length, 3);
    assert.ok(/<h3>Illustrations<\/h3>/.test(h));
  });
  await check('Assemble: a token for an image that does not exist, and a repeated token, add nothing and leave no text behind', async () => {
    const st = store({ 'Encode to Base': encodeItems().map((e, i) => (i === 1 ? { ...e, hasImage: false, base64Image: null } : e)), 'Check Sections': [checkedOut({ report_sections: { ...SECTION_HTML, visual_trends: '<h2>Visual Trend Story</h2><p>[[IMAGE_1]]</p><p>[[IMAGE_1]]</p><p>[[IMAGE_2]]</p><p>[[IMAGE_9]]</p>' } })] });
    const { cleanedHtml: h } = await assembled(await collected(st));
    assert.strictEqual((h.match(/<img /g) || []).length, 2);   // image 1 once, image 3 appended; image 2 does not exist
    assert.ok(!/\[\[IMAGE_/.test(h));
  });
  await check('Assemble: nothing from outside is loaded (no external font, script, link or stylesheet); the CSS styles tables and figures', async () => {
    const { cleanedHtml: h } = await assembled(await collected());
    assert.ok(!/<script|<link|@import|googleapis|https?:\/\//i.test(h), 'no external references');
    assert.ok(/table \{ width:100%/.test(h) && /figure\.moodboard/.test(h) && /@media print/.test(h));
  });
  await check('Assemble: a banner names every failed or review section at the top; none when everything is ok', async () => {
    const bad = checkedOut({ failed_sections: ['market_research'], sections_needing_review: ['attributes', 'risks'], ready: false });
    const { cleanedHtml: h } = await assembled(await collected(store({ 'Check Sections': [bad] })));
    assert.ok(/<div class="banner"><strong>Incomplete report\.<\/strong> Not generated: Market and Customer Insights\. Needs review before use: Attribute and Assortment Analysis, Risks and Watchouts\./.test(h));
    assert.ok(h.indexOf('class="banner"') < h.indexOf('<main>'));
    const { cleanedHtml: ok } = await assembled(await collected());
    assert.ok(!/class="banner"/.test(ok.replace(/\.banner \{[^}]*\}/, '')));
  });
  await check('Assemble: even if a script or an onclick slipped past Check Sections it never reaches the page', async () => {
    const dirty = { ...SECTION_HTML, risks: '<h2>Risks</h2><p onclick="steal()">text</p><script>alert(1)</script><a href="javascript:evil()">x</a>' };
    const { cleanedHtml: h } = await assembled(await collected(store({ 'Check Sections': [checkedOut({ report_sections: dirty })] })));
    assert.ok(!/<script|onclick|javascript:|alert\(1\)/i.test(h));
  });
  await check('Assemble: a missing or empty section is skipped (the validator reports it) and the page is still complete', async () => {
    const parts = { ...SECTION_HTML }; delete parts.scope; parts.risks = '   ';
    const { cleanedHtml: h } = await assembled(await collected(store({ 'Check Sections': [checkedOut({ report_sections: parts })] })));
    assert.ok(!/id="scope"/.test(h) && !/id="risks"/.test(h) && h.endsWith('</html>'));
  });

  // ---------- Section Validator1 ----------
  const validated = async (cleanedHtml, c) => (await run('Section Validator1', { store: { 'Collect All Sections': [c] }, input: [{ cleanedHtml }] }))[0].json;
  await check('Validator: a complete report with all images is valid, with no warnings', async () => {
    const c = await collected();
    const v = (await validated((await assembled(c)).cleanedHtml, c)).validation;
    assert.strictEqual(v.isValid, true, JSON.stringify(v));
    assert.deepStrictEqual(v.sectionsMissing, []);
    assert.strictEqual(v.sectionsFound.length, 8);
    assert.strictEqual(v.imageCount, 3);
    assert.deepStrictEqual(v.warnings, []);
  });
  await check('Validator: a failed section (placeholder text) is reported by name and makes the report invalid; the old weak keyword test would have passed it', async () => {
    const failedHtml = { ...SECTION_HTML, market_research: '<h2>Market and Customer Insights</h2><p>This section could not be generated automatically (no usable text was returned). Run the workflow again; the other sections are not affected.</p>' };
    const c = await collected(store({ 'Check Sections': [checkedOut({ report_sections: failedHtml, failed_sections: ['market_research'], ready: false })] }));
    const v = (await validated((await assembled(c)).cleanedHtml, c)).validation;
    assert.strictEqual(v.isValid, false);
    assert.deepStrictEqual(v.sectionsFailed, ['Market and Customer Insights']);
    assert.ok(v.warnings.some((w) => /could not be generated/.test(w)));
  });
  await check('Validator: missing sections, review sections, missing images, a left-over token, a script, a cut-off page: each is a warning and invalidates', async () => {
    const c = await collected();
    const good = (await assembled(c)).cleanedHtml;
    const miss = (await validated(good.replace(/<section id="risks">[\s\S]*?<\/section>/, ''), c)).validation;
    assert.deepStrictEqual(miss.sectionsMissing, ['Risks and Watchouts']); assert.strictEqual(miss.isValid, false);
    const noImg = (await validated(good.replace(/<img [^>]*>/g, ''), c)).validation;
    assert.ok(noImg.warnings.some((w) => /Only 0 of 3 images/.test(w))); assert.strictEqual(noImg.isValid, false);
    const token = (await validated(good.replace('Caption one', '[[IMAGE_4]]'), c)).validation;
    assert.ok(token.warnings.some((w) => /placeholder was left/.test(w))); assert.strictEqual(token.isValid, false);
    const script = (await validated(good.replace('<main>', '<main><script>x()</script>'), c)).validation;
    assert.ok(script.warnings.some((w) => /script tag/.test(w))); assert.strictEqual(script.isValid, false);
    const cut = (await validated(good.slice(0, good.length - 400), c)).validation;
    assert.ok(cut.warnings.some((w) => /cut off/.test(w))); assert.strictEqual(cut.isValid, false);
    const review = await collected(store({ 'Check Sections': [checkedOut({ sections_needing_review: ['attributes'], ready: false })] }));
    const rv = (await validated((await assembled(review)).cleanedHtml, review)).validation;
    assert.deepStrictEqual(rv.sectionsNeedingReview, ['attributes']); assert.strictEqual(rv.isValid, false);
  });
  await check('Validator: when no image existed at all the report can still be valid, with a note', async () => {
    const c = await collected(store({ 'Encode to Base': encodeItems().map((e) => ({ ...e, hasImage: false, base64Image: null })) }));
    const v = (await validated((await assembled(c)).cleanedHtml, c)).validation;
    assert.strictEqual(v.expectedImages, 0);
    assert.ok(v.warnings.some((w) => /No images were available/.test(w)));
  });

  // ---------- Download Final Report ----------
  await check('Download: a text/html binary named category_trend_report_date.html whose content is exactly the page; validation travels with it', async () => {
    const c = await collected();
    const page = (await assembled(c)).cleanedHtml;
    const val = (await validated(page, c));
    const out = (await run('Download Final Report', { store: { 'Collect All Sections': [c] }, input: [val] }))[0];
    assert.strictEqual(out.json.fileName, 'area_rug_trend_report_2026-10-28.html');
    assert.strictEqual(out.binary.data.mimeType, 'text/html');
    assert.strictEqual(out.binary.data.fileName, out.json.fileName);
    assert.strictEqual(Buffer.from(out.binary.data.data, 'base64').toString('utf8'), page);
    assert.strictEqual(out.json.ready, true);
    assert.ok(out.json.sizeKB > 0);
  });
  await check('Download: falls back to a plain base64 binary when prepareBinaryData is not available; odd category names become a safe file name', async () => {
    const c = await collected(store({ 'Check Sections': [checkedOut({ category: 'Hallway / Runner: 2x8?' })] }));
    const out = (await run('Download Final Report', { store: { 'Collect All Sections': [c] }, input: [{ cleanedHtml: '<html>x</html>', validation: { isValid: false } }], helpers: { prepareBinaryData: async () => { throw new Error('no helper'); } } }))[0];
    assert.strictEqual(out.json.fileName, 'hallway_runner_2x8_trend_report_2026-10-28.html');
    assert.strictEqual(Buffer.from(out.binary.data.data, 'base64').toString('utf8'), '<html>x</html>');
    assert.strictEqual(out.json.ready, false);
  });

  // ---------- End to end with the real shape of Check Sections output ----------
  await check('end to end: Collect > Assemble > Validate > Download on a full report gives a valid file with 3 embedded images and a safe name', async () => {
    const c = await collected();
    const page = (await assembled(c)).cleanedHtml;
    const val = await validated(page, c);
    assert.strictEqual(val.validation.isValid, true);
    const out = (await run('Download Final Report', { store: { 'Collect All Sections': [c] }, input: [val] }))[0];
    const html = Buffer.from(out.binary.data.data, 'base64').toString('utf8');
    assert.strictEqual((html.match(/<img /g) || []).length, 3);
    assert.ok(html.length < 5 * 1024 * 1024);
  });

  console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
  process.exit(failures ? 1 : 0);
})();
