"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("vitest/config");
const vite_plugin_node_polyfills_1 = require("vite-plugin-node-polyfills");
exports.default = (0, config_1.defineConfig)(() => {
    /** @type {import("vitest/config").UserConfigExport} */
    return {
        test: {
            hideSkippedTests: true,
            testTimeout: 30000,
            fileParallelism: false,
        },
    };
});
