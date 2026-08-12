# progressbar

A simple, lightweight and accessible progressbar to visualize request status for XHR requests. Based on [@rstacruz](https://github.com/rstacruz)'s [nprogress](https://github.com/rstacruz/nprogress), rewritten in **TypeScript** as a modern ESM module without the jQuery dependency, with added accessibility.

- **Fully typed** – written in TypeScript and ships its own type declarations, so options and return values are checked in any TypeScript project. No `@types/*` package required.
- **ESM only** – tree-shakeable, no runtime dependencies.
- **Accessible** – renders a `role="progressbar"` element with a configurable `aria-label` and a live `aria-valuenow`.

## Installation

```bash
npm install @sscharfenberg/progressbar
```

## Usage

First, import the functions you need:

```ts
import { doesProgressBarExist, finishProgress, setProgress, startProgress } from "@sscharfenberg/progressbar";
```

- To create the progressbar, call `startProgress()` (optionally with an options object).
- To set the progressbar to a specific value (between `0` and `1`), call `setProgress(0.4)`.
- When the request is finished, call `finishProgress()`.
- To check whether a progressbar is currently on the page, call `doesProgressBarExist()`.

### TypeScript

The package ships its own declarations, so the public API and options are type-checked automatically. The option object type is exported for reuse:

```ts
import { startProgress, type ProgressBarOptions } from "@sscharfenberg/progressbar";

const options: ProgressBarOptions = {
    parent: "#app",
    trickleSpeed: 400,
    ariaLabel: "Loading page"
};

startProgress(options);
```

Two types are exported:

| Type                  | Description                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------ |
| `ProgressBarOptions`  | The options object accepted by `startProgress`. Every property is optional.                      |
| `ProgressBarSettings` | The fully-resolved settings (`Required<ProgressBarOptions>`) after merging options and defaults. |

### InertiaJS implementation

In your application entrypoint (usually `app.ts` / `app.js`):

```ts
import { router } from "@inertiajs/vue3";
import {
    doesProgressBarExist,
    finishProgress,
    setProgress,
    startProgress,
    type ProgressBarOptions
} from "@sscharfenberg/progressbar";

const progressBarSettings: ProgressBarOptions = { parent: "#app" };
let timeout: ReturnType<typeof setTimeout> | undefined;

/**
 * A prefetch is nobody waiting, and a partial reload refreshes part of a page that is
 * staying put — neither should paint a full-width bar. See "Prefetching" below.
 */
const isBackgroundVisit = (event: { detail: { visit: { only: string[]; prefetch: boolean } } }): boolean =>
    event.detail.visit.prefetch || event.detail.visit.only.length > 0;

/**
 * arm the bar — on `before`, NOT on `start`. See "Prefetching" below for why.
 */
router.on("before", event => {
    if (isBackgroundVisit(event)) return;
    clearTimeout(timeout);
    timeout = setTimeout(() => startProgress(progressBarSettings), 250);
});

/**
 * on router progress — fires for UPLOADS only; ordinary GET visits report no
 * percentage at all and are carried by the `trickle` option instead.
 */
router.on("progress", event => {
    if (doesProgressBarExist() && event.detail.progress?.percentage) {
        setProgress((event.detail.progress.percentage / 100) * 0.9);
    }
});

/**
 * on router finish
 */
router.on("finish", event => {
    if (isBackgroundVisit(event)) return;
    clearTimeout(timeout);
    if (doesProgressBarExist() && event.detail.visit.completed) {
        finishProgress();
    } else if (event.detail.visit.interrupted) {
        setProgress(0);
    } else if (event.detail.visit.cancelled) {
        finishProgress();
    }
});

/**
 * the disarm backstop — a visit served from a COMPLETED prefetch fires no `finish`
 * at all, so without this the bar would go up 250ms after such a click and stay up.
 * `navigate` carries no `visit`, so there is nothing to filter; taking down a bar
 * that was never drawn is a no-op.
 */
router.on("navigate", () => {
    clearTimeout(timeout);
    if (doesProgressBarExist()) finishProgress();
});
```

#### Prefetching, and why the bar is armed on `before`

If any of your links use `<Link prefetch>` — or you prefetch by hand — the obvious wiring is
wrong in two directions, and both fail quietly.

**Inertia fires the same events for a prefetch as for a real visit.** Resting the pointer on a
link therefore raises a full-page bar for a page nobody has asked for, and the reader sees the
page flash as they move the mouse across a list of links. That is what `isBackgroundVisit`
above is for; the same guard belongs on any other loading chrome you paint (a table overlay, a
skeleton).

**And prefetching does not only add events — it removes them.** Which ones depends on where the
click lands relative to the request the hover started:

| the click…                                          | events for that visit                          |
| --------------------------------------------------- | ---------------------------------------------- |
| outran the hover timer, so nothing was prefetched   | `before` → **`start`** → `finish` → `navigate` |
| landed while the prefetch was **in flight**         | `before` → `finish` → `navigate`               |
| landed after the prefetch **completed** (cache hit) | `before` → `navigate`                          |

So `start` fires only in the case where nothing was warmed, and `finish` never fires for a cache
hit. A bar armed on `start` is therefore missing in **exactly** the case it exists for: the
middle row is a real wait — the click is parked on a request already in flight — and it presents
as "nothing happens, then the page switches". The bottom row is instant and correctly shows
nothing, because the 250ms delay expires first.

**`before` is the only event all three share, and `navigate` is the only stop the cache hit
sends** — hence the pair above. Keep `finish` as well: it owns the interrupted and cancelled
cases, which never reach `navigate`.

#### A note on `parent`

`position: fixed` resolves against the nearest ancestor with a `transform`, `filter`,
`perspective`, `backdrop-filter`, `will-change` or `contain: paint` — against the viewport only
when there is none. So if the element you pass as `parent` sits inside one of those, the bar is
positioned (or clipped) relative to it rather than pinned to the top of the window. It is worth
checking once when you wire it up, because nothing errors: the bar simply appears somewhere
unexpected, or not at all.

While `progressbar` was developed and tested for `InertiaJS`, it should work – like its precursor `nprogress` – with other Ajax link libraries such as Turbolinks or Pjax.

## CSS

You need to import/add the CSS for the progressbar. The JavaScript does not contain any styles.

### Using the default styles

```ts
import "@sscharfenberg/progressbar/progressbar.css";
```

### Using your own styles

Feel free to copy the CSS contents into your own scss/css files, change everything, or create completely new styles.

## Options

`startProgress` accepts an optional `ProgressBarOptions` object. Every property is optional; any property you omit falls back to its default.

```ts
import { startProgress, type ProgressBarOptions } from "@sscharfenberg/progressbar";

const options: ProgressBarOptions = { trickle: false, startingValue: 0.2 };
startProgress(options);
```

### `debug`: `false`

Whether to output debug information to the browser console. `false` outputs nothing.

### `trickle`: `true`

Whether to automatically increment the progressbar to give the illusion that something is happening – even while just waiting for the server to answer.

This is what carries an ordinary Inertia page visit: `progress` events report an **upload** percentage, so a GET reports nothing at all and the bar would otherwise sit at `startingValue` for the whole wait. Leave it on unless you are driving the value yourself with `setProgress`.

### `trickleSpeed`: `800`

The duration in ms between each trickle increment.

### `trickleRate`: `0.02`

`Math.random() * trickleRate` is the increment used for trickling.

### `startingValue`: `0.1`

The starting value for the progressbar.

### `parent`: `"main"`

The `querySelector` for the DOM node the progressbar is appended to. For accessibility reasons this should be inside a landmark.

Mind what that node sits inside: a `transform`, `filter` or `contain: paint` on any ancestor becomes the containing block for the bar's `position: fixed`, and it is then placed relative to that element instead of the viewport. See _A note on `parent`_ above.

### `barSelector`: `".progressbar__bar"`

The `querySelector` (relative to the progressbar) of the bar element whose width changes.

### `ariaLabel`: `"Loading progress"`

I18N `aria-label` for the progressbar.

### `minValue`: `0.1`

Lower bound used when clamping the progress value (applies to both trickling and `setProgress`).

### `maxValue`: `0.994`

Upper bound used when clamping the progress value (applies to both trickling and `setProgress`).

### `template`

The HTML template for the progressbar. Default:

```html
<div
    id="progressbar"
    class="progressbar"
    role="progressbar"
    aria-label=""
    aria-valuemin="0"
    aria-valuemax="100"
    aria-valuenow=""
>
    <div class="progressbar__bar"></div>
</div>
```

The `id="progressbar"` and `role="progressbar"` are required for the progressbar to function correctly. `class="progressbar"` is needed for the default styling but can be changed without changing the JavaScript.

The aria attributes should be kept on the outer element; `aria-valuenow` is updated whenever the progressbar changes.

## Development

The library is written in TypeScript in `src/index.ts` and compiled to `dist/` with the TypeScript compiler.

```bash
npm install       # install dependencies
npm run build     # compile src/ -> dist/ (ESM + .d.ts + source maps)
npm run typecheck # type-check without emitting
npm run prettier  # format the source
```

The published package contains the compiled `dist/`, the original `src/` (for source-map navigation), and `progressbar.css`.

## License

[MIT](./LICENSE) © Sven Scharfenberg
