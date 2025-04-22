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

