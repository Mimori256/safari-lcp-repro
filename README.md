# Safari LCP repro

Minimal repro for the `web-vitals` CI failure where Safari 27.2 (macOS 26.7.2 runner)
fails every `onLCP()` e2e test, while Safari 26.6.2 passed.

Symptoms seen in web-vitals CI:

- `assert(lcp.value > 500)` fails (the test image is delayed 500ms), or
- the LCP element is the `<h1>` (`HTMLHeadingElement`) instead of the delayed `<img>`.

This repo contains no web-vitals code. It loads a page with an `<h1>` and a 300x300
image served after a configurable delay, records all `largest-contentful-paint`
entries, and checks that the final LCP is the `<img>` with `startTime > delay`.

## Run (macOS only)

```sh
sudo safaridriver --enable
npm install
npm run repro
```

Or push and look at the `Safari LCP repro` workflow (matrix: macos-15, macos-26).
Compare the printed `Browser:` line and the LCP entries between runs.
`delay=0` is a control and does not affect the exit code.

## Try it by hand on a Mac (GitHub Pages)

Open <https://mimori256.github.io/safari-lcp-repro/> in Safari and press
**Run all variants**. No server is needed: the image is generated with `<canvas>`
and inserted after a delay. Do not scroll or click while it runs (scroll/input
legitimately stops LCP reporting). The summary page has a block you can copy into a
bug report. Note your macOS version and the Safari build (Safari > About Safari).

## Verify locally on a Mac

Requirements: macOS, Safari, Node.js 20+ (`brew install node`).

```sh
git clone https://github.com/Mimori256/safari-lcp-repro.git
cd safari-lcp-repro
./scripts/mac-check.sh
```

`mac-check.sh` records the environment (macOS, Safari and WebKit build, whether it
is a VM), installs dependencies, runs `sudo safaridriver --enable` (asks for your
password once), and runs the repro. Everything is saved to `results/mac-*.txt`; attach
that file to the bug report. Do not touch the Safari windows while it runs.

| Command | What it does |
|---|---|
| `./scripts/mac-check.sh` | Environment + full repro, saved to `results/` |
| `BROWSER=safari-tp ./scripts/mac-check.sh` | Same on Safari Technology Preview (is it fixed upstream?) |
| `REPEAT=3 ./scripts/mac-check.sh` | Fewer repetitions (default 5) |
| `npm run env` | Only print the environment details |
| `npm run repro` | Only the automated repro (needs `safaridriver --enable` done) |
| `npm run open` | Start the server and open one variant in Safari to poke at manually |

How to read the result: for each variant the summary shows `pass/total` in a shared
session and in a fresh session per load. `FAIL` means the final LCP stayed the `<h1>`.
`svg-image` is informational (it fails on macOS 15 too). Reference results from CI,
all with Safari 27.2:

| runner | Safari build | result |
|---|---|---|
| macOS 15.8.2 | 20625.2.8.18.4 | passes (except `svg-image`) |
| macOS 26.7.2 | 21625.2.8.18.4 | every variant fails, incl. plain large text |

If your Mac is macOS 26.x and passes, the failure is probably specific to the GitHub
runner VM (`kern.hv_vmm_present = 1` there). If it fails on bare metal, that is a
stronger bug report.
