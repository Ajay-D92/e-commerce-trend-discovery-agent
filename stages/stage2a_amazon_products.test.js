// Local tests for stage2a_amazon_products.json (Stage 2A: Amazon products)
// Run: node stage2a_amazon_products.test.js
// Never calls the network and never touches n8n: it only parses the two workflow files and runs
// the Code-node sources locally.
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const load = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, f), 'utf8'));
const s2 = load('stage2a_amazon_products.json');
const s1 = load('stage1_input_and_routing.json');
const node = (wf, name) => wf.nodes.find((n) => n.name === name);
const runCode = (wf, name, items) => new Function('$input', node(wf, name).parameters.jsCode)({ all: () => items, first: () => items[0] });

let failures = 0;
const check = (label, fn) => {
  try { fn(); console.log(`PASS  ${label}`); }
  catch (e) { failures++; console.log(`FAIL  ${label}\n      ${e.message}`); }
};

// ---------- Structure ----------
check('exactly three nodes with the required names', () => {
  assert.deepStrictEqual(s2.nodes.map((n) => n.name), ['Fetch Amazon Products', 'Has Products?', 'Reshape Amazon Response']);
});
check('does not duplicate Stage 1 nodes', () => {
  for (const n of s2.nodes) assert.ok(!s1.nodes.some((m) => m.name === n.name), n.name);
});
check('node types, versions, unique ids, positions', () => {
  const t = Object.fromEntries(s2.nodes.map((n) => [n.name, [n.type, n.typeVersion]]));
  assert.deepStrictEqual(t['Fetch Amazon Products'], ['n8n-nodes-base.httpRequest', 4.2]);
  assert.deepStrictEqual(t['Has Products?'], ['n8n-nodes-base.if', 2.2]);
  assert.deepStrictEqual(t['Reshape Amazon Response'], ['n8n-nodes-base.code', 2]);
  assert.strictEqual(new Set(s2.nodes.map((n) => n.id)).size, 3);
  assert.ok(s2.nodes.every((n) => Array.isArray(n.position) && n.position.length === 2));
});
check('connections: Fetch -> Has Products? ; True -> Reshape ; False unconnected', () => {
  const c = s2.connections;
  assert.deepStrictEqual(Object.keys(c).sort(), ['Fetch Amazon Products', 'Has Products?']);
  assert.strictEqual(c['Fetch Amazon Products'].main[0][0].node, 'Has Products?');
  assert.strictEqual(c['Has Products?'].main[0][0].node, 'Reshape Amazon Response');
  assert.deepStrictEqual(c['Has Products?'].main[1], []);
  assert.strictEqual(c['Reshape Amazon Response'], undefined);
});
check('workflow is inactive and has no credentials or tokens', () => {
  assert.strictEqual(s2.active, false);
  const text = JSON.stringify(s2);
  assert.ok(!/credentials|authorization|bearer|api[_-]?key|token|password/i.test(text));
  assert.ok(s2.nodes.every((n) => !n.credentials));
});

// ---------- Fetch Amazon Products ----------
const fetchP = node(s2, 'Fetch Amazon Products').parameters;
check('HTTP request: GET, exact URL, no auth, 30 s timeout', () => {
  assert.strictEqual(fetchP.method, 'GET');
  assert.strictEqual(fetchP.url, 'http://34.196.186.128:8000/api/products/amazon');
  assert.strictEqual(fetchP.authentication, 'none');
  assert.strictEqual(fetchP.options.timeout, 30000);
});
check('query parameters: exact names, values and expressions', () => {
  assert.strictEqual(fetchP.sendQuery, true);
  assert.deepStrictEqual(fetchP.queryParameters.parameters, [
    { name: 'category', value: "={{ $('Input Parser1').item.json.categoryKey }}" },
    { name: 'limit', value: '10' },
    { name: 'focus', value: "={{ $('Input Parser1').item.json.focus || '' }}" },
  ]);
});
check('agreed setting: HTTP node continues on error (regular output)', () => {
  assert.strictEqual(node(s2, 'Fetch Amazon Products').onError, 'continueRegularOutput');
});

// ---------- Alignment with Stage 1 ----------
const evalExpr = (expr, parserItem) => {
  const body = expr.replace(/^=\{\{\s*/, '').replace(/\s*\}\}$/, '');
  return new Function('$', `return ${body};`)((name) => {
    assert.strictEqual(name, 'Input Parser1');
    return { item: { json: parserItem } };
  });
};
const queryExpr = (n) => fetchP.queryParameters.parameters.find((q) => q.name === n).value;
const KEYS = { 'area rug': 'area_rug', 'outdoor rug': 'outdoor_rug', 'hallway runner': 'hallway_runner', 'shag rug': 'shag_rug' };
for (const [msg, key] of Object.entries(KEYS)) {
  check(`Stage 1 -> Stage 2A: "${msg}" resolves category=${key}`, () => {
    const parsed = runCode(s1, 'Input Parser1', [{ json: { chatInput: msg } }])[0].json;
    assert.strictEqual(evalExpr(queryExpr('category'), parsed), key);
    assert.strictEqual(evalExpr(queryExpr('focus'), parsed), '');
  });
}
check('Stage 1 -> Stage 2A: focus value is passed through', () => {
  const parsed = runCode(s1, 'Input Parser1', [{ json: { chatInput: 'outdoor rug, focus: washable' } }])[0].json;
  assert.strictEqual(evalExpr(queryExpr('category'), parsed), 'outdoor_rug');
  assert.strictEqual(evalExpr(queryExpr('focus'), parsed), 'washable');
});

// ---------- Has Products? ----------
check('IF: number "is greater than" 0 on total_products, with lenient typing', () => {
  const c = node(s2, 'Has Products?').parameters.conditions;
  assert.strictEqual(c.conditions.length, 1);
  assert.strictEqual(c.conditions[0].leftValue, '={{ $json.total_products }}');
  assert.strictEqual(c.conditions[0].rightValue, 0);
  assert.deepStrictEqual(c.conditions[0].operator, { type: 'number', operation: 'gt' });
  assert.strictEqual(c.options.typeValidation, 'loose');
  assert.strictEqual(c.combinator, 'and');
});

// ---------- Reshape Amazon Response ----------
check('Reshape: Run Once for All Items, JavaScript', () => {
  const p = node(s2, 'Reshape Amazon Response').parameters;
  assert.strictEqual(p.mode, 'runOnceForAllItems');
  assert.strictEqual(p.language, 'javaScript');
});
const reshape = (json) => runCode(s2, 'Reshape Amazon Response', [{ json }]);
check('Reshape: maps products to the legacy { amazonProducts } shape', () => {
  const out = reshape({ total_products: 2, scraped_at: '2026-10-21T10:00:00Z', products: [
    { url: 'u1', name: 'n1', price: '$10', details: ['d'], pattern: 'p', image_url: 'i', rating: '4.5', review_count: '12' },
    { url: 'u2', name: 'n2', price: '$20' }] });
  assert.strictEqual(out.length, 1);
  const j = out[0].json;
  assert.strictEqual(j.totalProducts, 2);
  assert.strictEqual(j.scrapedAt, '2026-10-21T10:00:00Z');
  assert.deepStrictEqual(j.amazonProducts[0], { url: 'u1', name: 'n1', price: '$10', details: ['d'], pattern: 'p',
    image_url: 'i', rating: '4.5', review_count: '12', scraped_at: '2026-10-21T10:00:00Z' });
  assert.deepStrictEqual(j.amazonProducts[1], { url: 'u2', name: 'n2', price: '$20', details: [], pattern: '',
    image_url: '', rating: '', review_count: '', scraped_at: '2026-10-21T10:00:00Z' });
});
check('Reshape: missing products / scraped_at fall back safely', () => {
  const j = reshape({}) [0].json;
  assert.deepStrictEqual(j.amazonProducts, []);
  assert.strictEqual(j.totalProducts, 0);
  assert.ok(!Number.isNaN(Date.parse(j.scrapedAt)));
});

// ---------- The False branch lands in Error Response1 correctly ----------
check('False-branch items (0 products, failed request) give the no_products chat message', () => {
  for (const apiItem of [{ total_products: 0, products: [] }, { error: 'timeout of 30000ms exceeded' }]) {
    const r = runCode(s1, 'Error Response1', [{ json: apiItem }])[0].json;
    assert.strictEqual(r.reason, 'no_products');
    assert.ok(r.output.startsWith('No products were returned'));
  }
});

console.log(failures === 0 ? '\nALL TESTS PASSED' : `\n${failures} TEST(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
