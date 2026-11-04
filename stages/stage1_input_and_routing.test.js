// Local tests for stage1_input_and_routing.json (Stage 1: Input & Routing)
// Run: node stage1_input_and_routing.test.js
// Extracts the Code-node source from the workflow JSON and runs it exactly as n8n would
// (Run Once for All Items, `$input.all()`), so the tests exercise the real artifact.
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const wf = JSON.parse(fs.readFileSync(path.join(__dirname, 'stage1_input_and_routing.json'), 'utf8'));
const node = (name) => wf.nodes.find((n) => n.name === name);
const runCode = (name, items) => {
  const fn = new Function('$input', node(name).parameters.jsCode);
  return fn({ all: () => items, first: () => items[0] });
};
const parse = (chatInput) => runCode('Input Parser1', [{ json: { chatInput } }])[0].json;

let failures = 0;
const check = (label, fn) => {
  try { fn(); console.log(`PASS  ${label}`); }
  catch (e) { failures++; console.log(`FAIL  ${label}\n      ${e.message}`); }
};

// ---------- 1. Structure ----------
check('exactly four nodes with the required names', () => {
  assert.deepStrictEqual(wf.nodes.map((n) => n.name), [
    'When chat message received', 'Input Parser1', 'Category Validator1', 'Error Response1']);
});
check('node types and versions', () => {
  assert.strictEqual(node('When chat message received').type, '@n8n/n8n-nodes-langchain.chatTrigger');
  assert.strictEqual(node('Input Parser1').type, 'n8n-nodes-base.code');
  assert.strictEqual(node('Category Validator1').type, 'n8n-nodes-base.if');
  assert.strictEqual(node('Error Response1').type, 'n8n-nodes-base.code');
  assert.strictEqual(node('Category Validator1').typeVersion, 2.2);
});
check('Code nodes run once for all items', () => {
  assert.strictEqual(node('Input Parser1').parameters.mode, 'runOnceForAllItems');
  assert.strictEqual(node('Error Response1').parameters.mode, 'runOnceForAllItems');
});
check('connections: Trigger -> Parser -> IF; IF true empty; IF false -> Error Response1', () => {
  const c = wf.connections;
  assert.strictEqual(c['When chat message received'].main[0][0].node, 'Input Parser1');
  assert.strictEqual(c['Input Parser1'].main[0][0].node, 'Category Validator1');
  assert.deepStrictEqual(c['Category Validator1'].main[0], []);
  assert.strictEqual(c['Category Validator1'].main[1][0].node, 'Error Response1');
  assert.strictEqual(c['Error Response1'], undefined);
  for (const [from, v] of Object.entries(c)) {
    assert.ok(node(from), `unknown source ${from}`);
    for (const out of v.main) for (const t of out) assert.ok(node(t.node), `unknown target ${t.node}`);
  }
});
check('IF checks boolean is_valid with strict typing', () => {
  const cond = node('Category Validator1').parameters.conditions;
  assert.strictEqual(cond.options.typeValidation, 'strict');
  assert.strictEqual(cond.conditions[0].leftValue, '={{ $json.is_valid }}');
  assert.deepStrictEqual(cond.conditions[0].operator, { type: 'boolean', operation: 'true', singleValue: true });
});
check('no credentials and no external URLs', () => {
  const text = JSON.stringify(wf);
  assert.ok(!/credentials/i.test(text), 'credentials key found');
  assert.ok(!/https?:\/\//i.test(text), 'URL found');
  assert.ok(wf.nodes.every((n) => !n.credentials));
});
check('node ids are unique', () => {
  const ids = wf.nodes.map((n) => n.id);
  assert.strictEqual(new Set(ids).size, ids.length);
});

// ---------- 2. Parser cases (from the brief) ----------
const cases = [
  ['outdoor rug, focus: washable', true, 'Outdoor Rug', 'washable'],
  ['hallway runner, focus: non-slip', true, 'Hallway Runner', 'non-slip'],
  ['shag rug, focus: fluffy', true, 'Shag Rug', 'fluffy'],
  ['area rug, focus: modern', true, 'Area Rug', 'modern'],
  ['outdoor rug', true, 'Outdoor Rug', null],
  ['OUTDOOR RUG', true, 'Outdoor Rug', null],
  ['outdoor area rug', true, 'Outdoor Rug', null],
  ['hallway runner, focus = washable', true, 'Hallway Runner', 'washable'],
  ['what is jute?', false, null, null],
  ['bath mats', false, null, null],
  ['', false, null, null],
  ['focus: washable', false, null, 'washable'],
  // extra coverage: formats, plurals, variants, false-positive guards
  ['area rug, focus: machine washable', true, 'Area Rug', 'machine washable'],
  ['area rug, focus: natural fibers', true, 'Area Rug', 'natural fibers'],
  ['Outdoor Rugs', true, 'Outdoor Rug', null],
  ['hallway runners', true, 'Hallway Runner', null],
  ['runner rug focus: durable', true, 'Hallway Runner', 'durable'],
  ['shaggy rug', true, 'Shag Rug', null],
  ['Shag-Rug, FOCUS : Soft', true, 'Shag Rug', 'soft'],
  ['indoor/outdoor rug', true, 'Outdoor Rug', null],
  ['outdoor shag rug', true, 'Outdoor Rug', null],
  ['hallway runner shag rug', true, 'Hallway Runner', null],
  ['focus: washable, outdoor rug', true, 'Outdoor Rug', 'washable'],
  ['what is the area of my room?', false, null, null],
  ['I am a marathon runner', false, null, null],
  ['outdoor furniture', false, null, null],
  ['rug', false, null, null],
  ['   ', false, null, null],
];
for (const [input, valid, category, focus] of cases) {
  check(`parse ${JSON.stringify(input)} -> ${valid ? category : 'invalid'}`, () => {
    const r = parse(input);
    assert.strictEqual(r.is_valid, valid);
    assert.strictEqual(r.category, category);
    assert.strictEqual(r.focus_keyword, focus);
    assert.ok(Array.isArray(r.all_matches));
    assert.strictEqual(r.all_matches.length > 0, valid);
    assert.strictEqual(r.original_message, input.trim());
  });
}
check('output shape matches the brief (valid example)', () => {
  assert.deepStrictEqual(parse('outdoor rug, focus: washable'), {
    original_message: 'outdoor rug, focus: washable', category: 'Outdoor Rug', focus_keyword: 'washable',
    is_valid: true, all_matches: ['Outdoor Rug'], parse_note: null,
    selectedCategory: 'Outdoor Rug', categoryKey: 'outdoor_rug', focus: 'washable',
    hasCategory: true, hasValidInput: true, errorReason: null });
});
check('output shape matches the brief (invalid example)', () => {
  assert.deepStrictEqual(parse('what is jute?'), {
    original_message: 'what is jute?', category: null, focus_keyword: null,
    is_valid: false, all_matches: [], parse_note: null,
    selectedCategory: null, categoryKey: null, focus: '',
    hasCategory: false, hasValidInput: false, errorReason: 'no_category' });
});
check('precedence: all_matches lists every match in precedence order', () => {
  assert.deepStrictEqual(parse('outdoor area rug').all_matches, ['Outdoor Rug', 'Area Rug']);
  assert.deepStrictEqual(parse('outdoor shag rug').all_matches, ['Outdoor Rug', 'Shag Rug']);
  assert.deepStrictEqual(parse('hallway runner shag area rug').all_matches, ['Hallway Runner', 'Shag Rug', 'Area Rug']);
});

// ---------- 2b. Merged-parser additions ----------
for (const [input, key] of [['area rug', 'area_rug'], ['outdoor rug', 'outdoor_rug'], ['hallway runner', 'hallway_runner'],
  ['shag rug', 'shag_rug'], ['patio rug', 'outdoor_rug'], ['Patio Rugs, focus: uv resistant', 'outdoor_rug']]) {
  check(`categoryKey for ${JSON.stringify(input)} is ${key}`, () => {
    const r = parse(input);
    assert.strictEqual(r.categoryKey, key);
    assert.strictEqual(r.selectedCategory, r.category);
    assert.strictEqual(r.hasCategory, true);
    assert.strictEqual(r.hasValidInput, true);
    assert.strictEqual(r.errorReason, null);
  });
}
check('invalid input: legacy fields and errorReason', () => {
  const r = parse('bath mats');
  assert.strictEqual(r.selectedCategory, null);
  assert.strictEqual(r.categoryKey, null);
  assert.strictEqual(r.focus, '');
  assert.strictEqual(r.hasValidInput, false);
  assert.strictEqual(r.errorReason, 'no_category');
});
check('commas stay inside the focus when no category follows', () => {
  const r = parse('area rug, focus: soft, plush, easy to clean');
  assert.strictEqual(r.category, 'Area Rug');
  assert.strictEqual(r.focus_keyword, 'soft, plush, easy to clean');
  assert.strictEqual(r.focus, 'soft, plush, easy to clean');
});
check('a comma followed by a category ends the focus', () => {
  const r = parse('focus: machine washable, hallway runner');
  assert.strictEqual(r.category, 'Hallway Runner');
  assert.strictEqual(r.focus_keyword, 'machine washable');
});
check('bare "runners" is not treated as a category (false-positive guard)', () => {
  assert.strictEqual(parse('my dog runners club').is_valid, false);
});
check('focus ends at a semicolon', () => {
  const r = parse('shag rug; focus: fluffy; extra text');
  assert.strictEqual(r.category, 'Shag Rug');
  assert.strictEqual(r.focus_keyword, 'fluffy');
});
check('multiple items are each parsed', () => {
  const out = runCode('Input Parser1', [{ json: { chatInput: 'area rug' } }, { json: { chatInput: 'nope' } }]);
  assert.deepStrictEqual(out.map((o) => o.json.is_valid), [true, false]);
});
check('missing chatInput does not crash', () => {
  const out = runCode('Input Parser1', [{ json: {} }]);
  assert.strictEqual(out[0].json.is_valid, false);
});

// ---------- 3. Ambiguity cases ----------
check('AMBIGUOUS "FOCUS:Washable Hallway Runner" -> rejected, category words not silently dropped', () => {
  const r = parse('FOCUS:Washable Hallway Runner');
  assert.strictEqual(r.is_valid, false);
  assert.strictEqual(r.category, null);
  assert.strictEqual(r.focus_keyword, 'washable hallway runner');
  assert.ok(r.parse_note.includes('Hallway Runner'));
  assert.strictEqual(r.errorReason, 'category_in_focus_ambiguous');
});
check('category outside focus wins; category words in focus are kept and flagged', () => {
  const r = parse('area rug, focus: outdoor rug friendly');
  assert.strictEqual(r.category, 'Area Rug');
  assert.strictEqual(r.focus_keyword, 'outdoor rug friendly');
  assert.ok(r.parse_note.includes('Outdoor Rug'));
});

// ---------- 4. Error Response1 ----------
const errorOut = (json) => runCode('Error Response1', [{ json }])[0].json;
check('Error Response1 emits `output` for the chat widget (plus error/message/reason)', () => {
  const r = errorOut(parse('what is jute?'));
  assert.deepStrictEqual(Object.keys(r), ['output', 'error', 'message', 'reason']);
  assert.strictEqual(r.output, r.message);
  assert.strictEqual(r.error, true);
  assert.strictEqual(r.reason, 'no_category');
  for (const c of ['Area Rug', 'Outdoor Rug', 'Hallway Runner', 'Shag Rug']) assert.ok(r.output.includes(c), c);
  assert.ok(r.output.includes('outdoor rug, focus: washable'));
  assert.ok(!r.output.includes('jute'), 'must not echo user input');
});
check('Error Response1 handles the ambiguity reason with the parse note', () => {
  const r = errorOut(parse('FOCUS:Washable Hallway Runner'));
  assert.strictEqual(r.reason, 'category_in_focus_ambiguous');
  assert.ok(r.output.includes('hallway runner, focus: washable'));
  assert.ok(r.output.startsWith('I could not detect a rug category.'));
});
check('Error Response1 handles explicit no_products and unknown reasons', () => {
  assert.ok(errorOut({ errorReason: 'no_products' }).output.startsWith('No products were returned'));
  assert.ok(errorOut({ errorReason: 'something_else' }).output.startsWith('An unknown error occurred'));
  assert.strictEqual(errorOut({ errorReason: 'something_else' }).reason, 'something_else');
});
check('Error Response1 infers no_products from API-shaped items (Has Products? False branch)', () => {
  for (const apiItem of [{ total_products: 0, products: [] }, { error: 'timeout of 30000ms exceeded' }, { statusCode: 500, error: 'x' }, {}]) {
    const r = errorOut(apiItem);
    assert.strictEqual(r.reason, 'no_products', JSON.stringify(apiItem));
    assert.ok(r.output.startsWith('No products were returned'));
  }
});
check('Error Response1: an item with products but no errorReason is "unknown"', () => {
  assert.strictEqual(errorOut({ total_products: 3, products: [{}] }).reason, 'unknown');
});
check('parser and error node set pairedItem so $(...).item works downstream', () => {
  const out = runCode('Input Parser1', [{ json: { chatInput: 'area rug' } }, { json: { chatInput: 'nope' } }]);
  assert.deepStrictEqual(out.map((o) => o.pairedItem), [{ item: 0 }, { item: 1 }]);
  const err = runCode('Error Response1', [{ json: { errorReason: 'no_category' } }, { json: {} }]);
  assert.deepStrictEqual(err.map((o) => o.pairedItem), [{ item: 0 }, { item: 1 }]);
});
check('Error Response1 processes every item', () => {
  const out = runCode('Error Response1', [{ json: { errorReason: 'no_category' } }, { json: { errorReason: 'no_products' } }]);
  assert.deepStrictEqual(out.map((o) => o.json.reason), ['no_category', 'no_products']);
});

check('Error Response1: Stage 3 reasons give specific messages', () => {
  const cases = { ai_unavailable: 'The AI service could not be reached', no_valid_products: 'None of the products returned matched', no_segments: 'I could not identify any clear trend segments', ai_output_invalid: 'The AI returned an answer I could not read safely' };
  for (const [reason, start] of Object.entries(cases)) {
    const r = errorOut({ errorReason: reason, segment: null });
    assert.strictEqual(r.reason, reason);
    assert.ok(r.output.startsWith(start), reason);
  }
});
console.log(failures === 0 ? '\nALL TESTS PASSED' : `\n${failures} TEST(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
