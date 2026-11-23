// Drives a browser via WebDriver, loads several page variants and reports, for
// each one, whether the image-like element became an LCP candidate.
//
//   safaridriver:  npm run repro
//   Chrome:        BROWSER=chrome npm run repro
import {Builder} from 'selenium-webdriver';
import {startServer} from './server.js';

const DELAY = 500;
// Variants that should each yield an LCP entry for their own 300x300 element.
// 'img' is the one that mirrors the web-vitals test and gates the exit code.
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

const server = await startServer(0);
const base = `http://localhost:${server.address().port}`;
const driver = await new Builder()
  .forBrowser(process.env.BROWSER || 'safari')
  .build();

const summary = [];
let failed = false;
try {
  const caps = await driver.getCapabilities();
  console.log(`Browser: ${caps.get('browserName')} ${caps.get('browserVersion')}`);

  for (const variant of VARIANTS) {
    await driver.get('about:blank');
    await driver.get(`${base}/?variant=${variant}&delay=${DELAY}`);
    await driver.wait(
      () => driver.executeScript('return window.__done === true'),
      20000,
    );
    const result = await driver.executeScript('return window.__result');

    console.log(`\n=== variant: ${variant} (delay ${DELAY}ms) ===`);
    console.log(JSON.stringify(result, null, 2));

    const tags = result.lcpEntries.map((e) => e.tag);
    const last = result.lcpEntries.at(-1);
    const expectedTag = result.target?.tag?.toUpperCase();
    // For <image> in SVG the LCP element may be reported as IMAGE or SVG.
    const ok = last != null && last.tag !== 'H1' && last.startTime > DELAY;
    summary.push({
      variant,
      lcpTags: tags.join(' > '),
      finalIsNotH1: ok ? 'PASS' : 'FAIL',
      loaded: result.target?.complete ?? 'n/a',
      naturalWidth: result.target?.naturalWidth ?? 'n/a',
      visible: result.target?.checkVisibility ?? 'n/a',
      inViewport: result.target?.inViewport ?? 'n/a',
      freshObserver: result.freshObserverTags?.join(' > ') ?? 'timeout',
      stopEvents:
        result.stopEvents.map((e) => `${e.type}${e.isTrusted ? '' : '(untrusted)'}`).join(',') ||
        'none',
      rafCount: result.rafCount,
      paint: result.paintEntries.map((p) => p.name).join(','),
    });
    if (variant === 'img' && !ok) failed = true;
  }
} finally {
  await driver.quit();
  server.close();
}

console.log('\n=== summary ===');
console.table(summary);
process.exit(failed ? 1 : 0);
