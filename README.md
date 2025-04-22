# progressbar

A simple, lightweight and accessible progressbar to visualize request status. Based on [nprogress](https://github.com/rstacruz/nprogress), rewritten as modern ESM without jQuery dependency, with added accessibility.

## Usage

First, import the needed functions:

```
import { 
    doesProgressBarExist, 
    finishProgress, 
    setProgress, 
    startProgress 
} from "@sscharfenberg/progressbar";
```

To create the progressbar, call `startProgress({})`. 

To set the progressbar to a specific value (between `0` and `1`), call `setProgress(0.4)`.

When the request is finished, call `finishProgress()`

### InertiaJS 3 implementation

In your application entrypoint (usually `app.js`):

```
import { createInertiaApp, router } from "@inertiajs/vue3";
import { 
    doesProgressBarExist, 
    finishProgress, 
    setProgress, 
    startProgress 
} from "@sscharfenberg/progressbar";
```

```
/**
 * @function on router start
 */
router.on("start", () => {
    timeout = setTimeout(() => startProgress(progressBarSettings), 250);
});

/**
 * @function on router progress
 */
router.on("progress", event => {
    if (doesProgressBarExist() && event.detail.progress.percentage) {
        setProgress((event.detail.progress.percentage / 100) * 0.9);
    }
});

/**
 * @function on router finish
 */
router.on("finish", event => {
    clearTimeout(timeout);
    if (doesProgressBarExist() && event.detail.visit.completed) {
        finishProgress();
    } else if (event.detail.visit.interrupted) {
        setProgress(0);
    } else if (event.detail.visit.cancelled) {
        finishProgress();
    }
});
```

## CSS

You need to import/add the CSS needed for the progressbar. The javascript does not contain the CSS styles.

### Using progressbar default styles

```
import "progressbar/progressbar.css";
```

### Using your own styles

Feel free to copy the css contents into your own scss/css files, change everything or create completely new styles.

## Options

You can supply an object for the startProgress function with option properties.

### `debug`: false

Whether to output debug information into the browsers console. `false` does not output anything.

### `trickle`: true

Whether to use the automatic incrementing of the progressbar to give the illusion that something is happening - even if it is just waiting for the server to answer.

### `trickleSpeed`: 800

The duration in ms between each trickle increments.

### `trickleRate`: 0.02

Math.random * trickleRate is the increment for trickling.

### `startingValue`: 0.1

The starting value for the progressbar.

### `parent`: "main"

The queryselector where the progressbar will be appended to. For accessibility reasons, this should be within a landmark.

### `barSelector`: ".progressbar__bar"

The queryselector inside the progressbar of the bar itself that changes the width.

### `ariaLabel`: "Loading progress"

I18N aria-label for the progressbar.

### `minValue`: 0.1

Min value for clamp function.

### `maxValue`: 0.994

Max value for clamp function.

### `template`: 

The HTML template for the progressbar. Default:
```
<div id="progressbar" class="progressbar" role="progressbar" aria-label="" aria-valuemin="0" aria-valuemax="100" aria-valuenow="">
    <div class="progressbar__bar"></div>
</div>
```
The `id=progressbar role="progressbar"` is needed for the progressbar to function correctly. `class="progressbar"` is needed for the styling, but can be changed without changing the Javascript.

The aria attributes should be kept on the outer element, `aria-valuenow` is updated when the progressbar is updated.
