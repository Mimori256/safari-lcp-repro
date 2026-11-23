// Drives Safari via safaridriver, collects LCP entries and checks the same
// invariants the web-vitals e2e tests rely on.
import {Builder} from 'selenium-webdriver';
import {startServer} from './server.js';

const server = await startServer(0);
const base = `http://localhost:${server.address().port}`;
// BROWSER=chrome npm run repro  (defaults to safari)
const driver = await new Builder()
  .forBrowser(process.env.BROWSER || 'safari')
  .build();

let failed = false;
try {
  const caps = await driver.getCapabilities();
  console.log(`Browser: ${caps.get('browserName')} ${caps.get('browserVersion')}`);

  for (const delay of [0, 500]) {
    await driver.get('about:blank');
    await driver.get(`${base}/?delay=${delay}`);
    await driver.wait(
      () => driver.executeScript('return window.__done === true'),
      15000,
    );
    const result = await driver.executeScript('return window.__result');

    console.log(`\n=== image delay ${delay}ms ===`);
    console.log(JSON.stringify(result, null, 2));

    const last = result.lcpEntries.at(-1);
    const checks = {
      'LCP entries were reported': result.lcpEntries.length > 0,
      'final LCP element is IMG': last?.tag === 'IMG',
      [`final LCP startTime > ${delay}`]: (last?.startTime ?? 0) > delay,
    };
    for (const [name, ok] of Object.entries(checks)) {
      console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`);
      if (!ok && delay === 500) failed = true; // delay=0 is only a control
    }
  }
} finally {
  await driver.quit();
  server.close();
}
process.exit(failed ? 1 : 0);
