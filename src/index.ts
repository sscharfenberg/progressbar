/*!
 * @sscharfenberg/progressbar
 * Simple, accessible progressbar to visualize request status.
 * @license MIT
 * @see https://github.com/sscharfenberg/progressbar
 */

/******************************************************************************
 * PUBLIC TYPES
 *****************************************************************************/

/**
 * User-supplied configuration for the progressbar. Every property is optional;
 * any property that is omitted (or explicitly `undefined`) falls back to the
 * built-in default. Pass an object to {@link startProgress}.
 */
export interface ProgressBarOptions {
    /** Output debug information to the browser console. Default: `false`. */
    debug?: boolean;
    /**
     * Automatically increment the bar over time to give the illusion that
     * something is happening while waiting for the server. Default: `true`.
     */
    trickle?: boolean;
    /** Interval in milliseconds between trickle increments. Default: `800`. */
    trickleSpeed?: number;
    /** `Math.random() * trickleRate` is the amount added per trickle. Default: `0.02`. */
    trickleRate?: number;
    /** Value the bar starts at, between `0` and `1`. Default: `0.1`. */
    startingValue?: number;
    /**
     * `querySelector` for the DOM node the progressbar is appended to. For
     * accessibility this should be inside a landmark element. Default: `"main"`.
     */
    parent?: string;
    /** `querySelector` (relative to the progressbar) for the visual bar. Default: `".progressbar__bar"`. */
    barSelector?: string;
    /** I18N `aria-label` announced for the progressbar. Default: `"Loading progress"`. */
    ariaLabel?: string;
    /** Lower bound used when clamping the progress value. Default: `0.1`. */
    minValue?: number;
    /** Upper bound used when clamping the progress value. Default: `0.994`. */
    maxValue?: number;
    /**
     * HTML template for the progressbar. The outer element must keep
     * `id="progressbar"` and `role="progressbar"` for the library to work; the
     * `aria-valuenow` attribute is updated on every change. Default: see source.
     */
    template?: string;
}

/**
 * Fully-resolved settings: {@link ProgressBarOptions} with every property
 * present. This is the shape the library works with internally after merging
 * user options with the defaults.
 */
export type ProgressBarSettings = Required<ProgressBarOptions>;

/******************************************************************************
 * INTERNAL STATE
 *****************************************************************************/

/** Built-in defaults, used for any option the caller does not provide. */
const defaultSettings: ProgressBarSettings = {
    debug: false,
    trickle: true,
    trickleSpeed: 800,
    trickleRate: 0.02,
    startingValue: 0.1,
    parent: "main",
    barSelector: ".progressbar__bar",
    ariaLabel: "Loading progress",
    minValue: 0.1,
    maxValue: 0.994,
    template: `<div id="progressbar" class="progressbar" role="progressbar" aria-label="" aria-valuemin="0" aria-valuemax="100" aria-valuenow="">
    <div class="progressbar__bar"></div>
</div>`
};

/** Live settings for the current run. Reset by {@link configure} on every start. */
let settings: ProgressBarSettings = { ...defaultSettings };

/** Current progress value, between `0` and `1`. */
let currentValue: number = defaultSettings.startingValue;

/*****************************************************************************
 * HELPERS
 *****************************************************************************/

/**
 * Convert a template string into the first element it describes.
 * Relies on {@link https://caniuse.com/mdn-api_domparser_parsefromstring DOMParser}.
 * @param str - The HTML template string.
 * @returns The parsed root element, or `null` if the string contains no element.
 */
const stringToHTML = (str: string): Element | null => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(str, "text/html");
    // We only care about the created node, not the surrounding <html>/<body>.
    return doc.body.firstElementChild;
};

/**
 * Clamp a value to an inclusive range.
 * @param val - The value to clamp.
 * @param min - Lower bound (inclusive). Default: `0`.
 * @param max - Upper bound (inclusive). Default: `1`.
 * @returns `val` limited to `[min, max]`.
 */
const clamp = (val: number, min = 0, max = 1): number => Math.min(Math.max(val, min), max);

/**
 * Merge user options over the defaults, resolve the starting value and store
 * the result in {@link settings}. Options set to `undefined` are ignored so
 * they never override a default.
 * @param options - Caller-supplied options.
 */
const configure = (options: ProgressBarOptions = {}): void => {
    settings = {
        debug: options.debug ?? defaultSettings.debug,
        trickle: options.trickle ?? defaultSettings.trickle,
        trickleSpeed: options.trickleSpeed ?? defaultSettings.trickleSpeed,
        trickleRate: options.trickleRate ?? defaultSettings.trickleRate,
        startingValue: options.startingValue ?? defaultSettings.startingValue,
        parent: options.parent ?? defaultSettings.parent,
        barSelector: options.barSelector ?? defaultSettings.barSelector,
        ariaLabel: options.ariaLabel ?? defaultSettings.ariaLabel,
        minValue: options.minValue ?? defaultSettings.minValue,
        maxValue: options.maxValue ?? defaultSettings.maxValue,
        template: options.template ?? defaultSettings.template
    };
    currentValue = settings.startingValue;
    if (settings.debug) console.log("configured to", settings);
};

/**
 * @returns The progressbar container element, or `null` if it does not exist.
 */
const progressNode = (): HTMLElement | null => document.getElementById("progressbar");

/**
 * @returns The visual bar element inside the progressbar, or `null` if absent.
 */
const barNode = (): HTMLElement | null => progressNode()?.querySelector<HTMLElement>(settings.barSelector) ?? null;

/**
 * Build the progressbar from the template and append it to the configured parent.
 */
const createBar = (): void => {
    const progressbar = stringToHTML(settings.template);
    const parent = document.querySelector(settings.parent);
    if (!progressbar || !parent) {
        if (settings.debug) {
            console.warn(`progressbar: could not create bar (template empty or parent "${settings.parent}" not found)`);
        }
        return;
    }
    progressbar.ariaLabel = settings.ariaLabel;
    parent.appendChild(progressbar);
};

/**
 * Start the progressbar: create it if needed and, when trickling is enabled,
 * schedule recurring increments until the bar is removed.
 */
const start = (): void => {
    const work = (): void => {
        setTimeout(() => {
            if (settings.debug) console.log("working...");
            if (!doesProgressBarExist()) return;
            trickle();
            work();
        }, settings.trickleSpeed);
    };
    if (!doesProgressBarExist()) createBar();
    if (settings.trickle) work();
};

/**
 * Update the existing progressbar to a new value, reflecting it visually and in
 * the `aria-valuenow` attribute. No-op if the bar is not in the DOM.
 * @param value - Progress value between `0` (0%) and `1` (100%).
 */
const update = (value: number): void => {
    const progress = progressNode();
    const bar = barNode();
    if (!progress || !bar) return;
    const percentage = (value * 100).toFixed(2);
    currentValue = value;
    if (settings.debug) console.log(`updating currentValue to ${value}, ${percentage}%`);
    // update CSS custom property to change the visual length of the bar
    bar.style.setProperty("--bar-percentage", `${percentage}%`);
    // update the announced aria value
    progress.ariaValueNow = percentage;
};

/**
 * Increase the bar by a random amount, bounded by {@link ProgressBarOptions.trickleRate}.
 */
const trickle = (): void => inc(Math.random() * settings.trickleRate);

/**
 * Increase the current progress value by a fixed amount, clamped to the
 * configured `[minValue, maxValue]` range.
 * @param amount - Amount to add to the current value.
 */
const inc = (amount: number): void => {
    const newValue = clamp(currentValue + amount, settings.minValue, settings.maxValue);
    if (settings.debug) console.log(`increase ${currentValue} by ${amount} to ${newValue}`);
    update(newValue);
};

/******************************************************************************
 * PUBLIC API
 *****************************************************************************/

/**
 * Set the progressbar to a specific value. The value is clamped to the
 * configured `[minValue, maxValue]` range. Passing `1` (or more) finishes the
 * progressbar. Does nothing if the progressbar does not currently exist.
 * @param value - Target value between `0` (0%) and `1` (100%).
 */
export const setProgress = (value: number): void => {
    if (!doesProgressBarExist()) return;
    update(clamp(value, settings.minValue, settings.maxValue));
    if (value >= 1) finishProgress();
};

/**
 * Start the progressbar. Creates the bar (if it does not already exist) using
 * the merged options and begins trickling when enabled. Does nothing if a
 * progressbar is already present.
 * @param options - Optional configuration; omitted values fall back to defaults.
 */
export const startProgress = (options: ProgressBarOptions = {}): void => {
    if (doesProgressBarExist()) return;
    configure(options);
    start();
};

/**
 * @returns `true` if a progressbar is currently present in the DOM.
 */
export const doesProgressBarExist = (): boolean => progressNode() !== null;

/**
 * Finish the progressbar: fill it to 100%, then remove it from the DOM shortly
 * after so the completion is visible.
 */
export const finishProgress = (): void => {
    update(1);
    setTimeout(() => {
        progressNode()?.remove();
    }, 250);
};
