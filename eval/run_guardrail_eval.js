// Guardrail eval: feeds recorded model replies through the Check Creative Brief node and checks each decision.
// No model call, no network. Run: node run_guardrail_eval.js
const fs = require('fs');
const path = require('path');

const wf = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'workflow.json'), 'utf8'));
const code = wf.nodes.find((n) => n.name === 'Check Creative Brief').parameters.jsCode;
const { facts, cases } = JSON.parse(fs.readFileSync(path.join(__dirname, 'guardrail_cases.json'), 'utf8'));
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

const check = async (output) => {
  const $ = (name) => {
    if (name !== 'Collect Audience Data') throw new Error(`Node '${name}' hasn't been executed`);
    const item = { json: { facts } };
    return { first: () => item, all: () => [item] };
  };
  const input = { output: typeof output === 'string' ? output : JSON.stringify(output) };
  const fn = new AsyncFunction('$', '$input', code);
  return (await fn.call({}, $, { first: () => ({ json: input }), all: () => [{ json: input }] }))[0].json;
};

(async () => {
  let passed = 0;
  for (const c of cases) {
    const r = await check(c.reply);
    const text = JSON.stringify(r.creative);
    const problems = [];
    if (c.expect.status && r.creativeStatus !== c.expect.status) problems.push(`status ${r.creativeStatus}, expected ${c.expect.status}`);
    for (const k of c.expect.kept || []) if (!text.includes(k)) problems.push(`expected to keep "${k}"`);
    for (const d of c.expect.dropped || []) if (text.includes(d)) problems.push(`expected to drop "${d}"`);
    if (c.expect.noMarkup && /[<>]/.test(text)) problems.push('markup reached the output');
    if (problems.length === 0) passed++;
    console.log(`${problems.length ? 'FAIL' : 'PASS'}  ${c.id}: ${c.why}${problems.length ? '\n      ' + problems.join('; ') : ''}`);
  }
  console.log(`\nGuardrail eval: ${passed} of ${cases.length} cases behave as expected`);
  process.exit(passed === cases.length ? 0 : 1);
})();
