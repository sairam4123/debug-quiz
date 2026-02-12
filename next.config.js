/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
    // ignore type errors
    typescript: {
        ignoreBuildErrors: true,
    },
    // ignore lint errors
    eslint: {
        ignoreDuringBuilds: true,
    },
};

export default config;
