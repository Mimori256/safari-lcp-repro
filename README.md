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
