import { terser } from 'rollup-plugin-terser';

// `npm run build` -> `production` is true
// `npm run dev` -> `production` is false
const production = !process.env.ROLLUP_WATCH;

export default {
    input: 'progressbar.js',
    output: {
        file: 'progressbar.min.js',
        format: 'es', // compile as ESM
        sourcemap: true,
        plugins: [terser()]
    }
};
