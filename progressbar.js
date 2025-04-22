/*!
 * @sscharfenberg/progressbar
 * Simple, accessible progressbar to visualize request status
 * @version 1.0.0
 */

/******************************************************************************
 * INTERNAL VARIABLES
 *****************************************************************************/

/**
 * defaultSettings
 * @type {Object}
 */
const defaultSettings = {
    debug: false, // true = console.log messages, false = none.
    trickle: true, // whether to increase the progressbar gradually to give the illusion something is happening.
    trickleSpeed: 800, // each trickleSpeed ms, the trickle function gets executed.
    trickleRate: 0.02, // Math.random * trickleRate = increase for trickle
    startingValue: 0.1, // starting value of progressbar
    parent: "main", // the querySelector for the DOM node where the progressbar is appended
    barSelector: ".progressbar__bar", // the querySelector for the visual bar
    ariaLabel: "Loading progress", // aria label, needed for accessibility.
    minValue: 0.1, // the minimum value for the progressbar
    maxValue: 0.994, // the maximum value for the progressbar
    template: `<div id="progressbar" class="progressbar" role="progressbar" aria-label="" aria-valuemin="0" aria-valuemax="100" aria-valuenow="">
    <div class="progressbar__bar"></div>
</div>` // html template for the progressbar
};

/**
 * settings - live object for the settings
 * @type {Object}
 */
let settings = {};

/**
 * currentValue - live number of current value between 0 and 1
 * @type {number}
 */
let currentValue;

/*****************************************************************************
 * HELPERS
 *****************************************************************************/

/**
 * @function stringToHTML - converts a template string into HTML DOM nodes
 * depends on https://caniuse.com/mdn-api_domparser_parsefromstring
 * @param  {String} str The template string
 * @return {HTMLElement} The template HTML node
 */
const stringToHTML = str => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(str, "text/html");
    return doc.body.querySelector("body > *"); // we don't need the html body, just the newly created nodes.
};

/**
 * @function clamp - return a value clamped to min and max:
 * if the value is below min, return min.
 * if the value is above max, return max.
 * otherwise, return value.
 * @param {number} val
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
const clamp = (val, min = 0, max = 1) => Math.min(Math.max(val, min), max);

/******************************************************************************
 * MAIN FUNCTIONS
 *****************************************************************************/

/**
 * @function configure - prepare settings variable with correct contents:
 * either defaultSettings or user supplied options
 * @param options
 */
const configure = options => {
    settings = defaultSettings;
    for (const [key, value] of Object.entries(options)) {
        if (value !== undefined && key in options) settings[key] = value;
    }
    currentValue = settings.startingValue;
    settings.debug && console.log("configured to", settings);
};

/**
 * @function progressNode - get HTMLElement of .progressbar
 * @returns {HTMLElement | null}
 */
const progressNode = () => document.getElementById("progressbar");

/**
 * @function barNode - get HTMLElement of .progressbar
 * @returns {HTMLElement | null}
 */
const barNode = () => progressNode()?.querySelector(settings.barSelector);

/**
 * @function createBar - create new progressbar with value
 */
const createBar = () => {
    const _progressbar = stringToHTML(settings.template);
    _progressbar.ariaLabel = settings.ariaLabel;
    document.querySelector(settings.parent).appendChild(_progressbar);
};

/**
 * @function start - start progressbar
 */
const start = () => {
    const work = () => {
        setTimeout(function () {
            settings.debug && console.log("working...");
            if (!doesProgressBarExist()) return;
            trickle();
            work();
        }, settings.trickleSpeed);
    };
    if (!doesProgressBarExist()) createBar();
    if (settings.trickle) work();
};

/**
 * @function update - update existing progressbar with value
 * @param {Number} value - value between 0 (= 0%) and 1 (= 100%)
 */
const update = value => {
    const percentage = (value * 100).toFixed(2);
    const _progress = progressNode();
    const _bar = barNode();
    currentValue = value; // update internal var
    settings.debug && console.log(`updating currentValue to ${value}, ${percentage}%`);
    // update CSS custom property to increase visual length of progressbar
    _bar.style.setProperty("--bar-percentage", percentage + "%");
    // update aria value
    _progress.ariaValueNow = percentage;
};

/**
 * @function trickle - increase bar by random amount
 */
const trickle = () => inc(Math.random() * settings.trickleRate);

/**
 * @function inc - increase progressbar by a set amount
 * @param amount
 */
const inc = amount => {
    let newValue = currentValue;
    if (typeof amount !== "number") {
        amount = (1 - newValue) * clamp(Math.random() * newValue, settings.minValue, settings.maxValue);
    }
    newValue = clamp(newValue + amount, settings.minValue, settings.maxValue);
    settings.debug && console.log(`increase ${currentValue} by ${amount} to ${newValue}`);
    return update(newValue);
};

/******************************************************************************
 * EXPORTS
 *****************************************************************************/

/**
 * @function setProgress - set progress bar to value
 * lower limit = 0, upper limit = 1
 * @param {Number} value - value between 0 (= 0%) and 1 (= 100%)
 */
export const setProgress = value => {
    if (doesProgressBarExist()) {
        update(clamp(value, 0.1, 0.994));
        if (value >= 1) finishProgress();
    }
};

/**
 * @function startProgress - starts the progress bar
 * @param options
 */
export const startProgress = options => {
    if (doesProgressBarExist()) return;
    else {
        configure(options);
        start();
    }
};

/**
 * @function checks if progressbar exists
 * @returns {boolean}
 */
export const doesProgressBarExist = () => progressNode() !== null;

/**
 * @function finishProgress - function to be called when the progress is finished.
 * set to 100%, cleanup
 */
export const finishProgress = () => {
    update(1);
    setTimeout(() => {
        progressNode()?.remove();
    }, 250);
};
