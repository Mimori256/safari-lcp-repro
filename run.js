// Drives a browser via WebDriver, loads several page variants and reports, for
// each one, whether the image-like element became an LCP candidate.
//
//   safaridriver:  npm run repro
//   Chrome:        BROWSER=chrome npm run repro
//   REPEAT=3 ...   number of repetitions per variant and mode (default 5)
//
// Two modes are compared, to tell "flaky" apart from "depends on session reuse":
//   shared: one browser session, pages loaded one after another
//   fresh:  a brand-new browser session for every single load
import {Builder} from 'selenium-webdriver';
import {startServer} from './server.js';

const DELAY = 500;
const REPEAT = Number(process.env.REPEAT || 5);
const BROWSER = process.env.BROWSER || 'safari';
const VARIANTS = [
  'img',
  'img-elementtiming',
  'img-nosize',
  'img-decode-then-insert',
  'img-parsed',
  'bg',
  'svg-image',
  'text', // control: unrelated to images
];
// Known to fail on every Safari we tried (including macOS 15), so it is
// reported but does not affect the exit code.
const INFORMATIONAL = new Set(['svg-image']);

const server = await startServer(0);
const base = `http://localhost:${server.address().port}`;
const newDriver = () => new Builder().forBrowser(BROWSER).build();

// Loads one variant and returns a compact description of what happened.
const runOne = async (driver, variant) => {
  await driver.get('about:blank');
  await driver.get(`${base}/?variant=${variant}&delay=${DELAY}`);
  await driver.wait(
    () => driver.executeScript('return window.__done === true'),
    20000,
  );
  const r = await driver.executeScript('return window.__result');
  const last = r.lcpEntries.at(-1);
  return {
    tags: r.lcpEntries.map((e) => e.tag).join(' > ') || '(none)',
    ok: last != null && last.tag !== 'H1' && last.startTime > DELAY,
    stopEvents: r.stopEvents.filter((e) => e.type !== 'focus' && e.type !== 'doc:focus').length,
    raw: r,
  };
};

// stats[mode][variant] = {pass, total, seq: ['P'|'F'...]}
const stats = {shared: {}, fresh: {}};
const record = (mode, variant, ok) => {
  const s = (stats[mode][variant] ??= {pass: 0, total: 0, seq: ''});
  s.total++;
  if (ok) s.pass++;
  s.seq += ok ? 'P' : 'F';
};

let version = '';
try {
  // --- shared mode ---
  const shared = await newDriver();
  try {
    version = `${(await shared.getCapabilities()).get('browserName')} ${(await shared.getCapabilities()).get('browserVersion')}`;
    console.log(`Browser: ${version}`);
    for (let i = 0; i < REPEAT; i++) {
      for (const variant of VARIANTS) {
        const res = await runOne(shared, variant);
        record('shared', variant, res.ok);
        console.log(`[shared #${i + 1}] ${variant}: ${res.ok ? 'PASS' : 'FAIL'}  LCP=${res.tags}  stopEvents=${res.stopEvents}`);
      }
    }
  } finally {
    await shared.quit();
  }

  // --- fresh mode ---
  for (let i = 0; i < REPEAT; i++) {
    for (const variant of VARIANTS) {
      const driver = await newDriver();
      try {
        const res = await runOne(driver, variant);
        record('fresh', variant, res.ok);
        console.log(`[fresh  #${i + 1}] ${variant}: ${res.ok ? 'PASS' : 'FAIL'}  LCP=${res.tags}  stopEvents=${res.stopEvents}`);
      } finally {
        await driver.quit();
      }
    }
  }
} finally {
  server.close();
}

console.log(`\n=== summary (${version}, ${REPEAT} repetitions) ===`);
const rows = VARIANTS.map((variant) => ({
  variant,
  shared: `${stats.shared[variant].pass}/${stats.shared[variant].total}`,
  'shared order': stats.shared[variant].seq,
  fresh: `${stats.fresh[variant].pass}/${stats.fresh[variant].total}`,
  'fresh order': stats.fresh[variant].seq,
}));
console.table(rows);

// Fail if any non-informational variant failed even once, in either mode.
const failed = VARIANTS.some(
  (v) =>
    !INFORMATIONAL.has(v) &&
    ['shared', 'fresh'].some((m) => stats[m][v].pass !== stats[m][v].total),
);
console.log(failed ? 'RESULT: FAIL' : 'RESULT: PASS');
process.exit(failed ? 1 : 0);
