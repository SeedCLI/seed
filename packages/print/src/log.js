import chalk from "chalk";
import { box as renderBox } from "./box.js";
import { divider as renderDivider } from "./divider.js";
import { ascii as renderAscii } from "./figlet.js";
import { keyValue as renderKeyValue } from "./keyValue.js";
import { progressBar } from "./progress.js";
import { spin } from "./spinner.js";
import { table as renderTable } from "./table.js";
import { tree as renderTree } from "./tree.js";
let debugEnabled = false;
export function setDebugMode(enabled) {
    debugEnabled = enabled;
}
export function info(message) {
    console.log(message);
}
export function success(message) {
    console.log(chalk.green(`✔ ${message}`));
}
export function warning(message) {
    console.log(chalk.yellow(`⚠ ${message}`));
}
export function error(message) {
    console.error(chalk.red(`✖ ${message}`));
}
export function debug(message) {
    if (debugEnabled) {
        console.log(chalk.gray(`● ${message}`));
    }
}
export function highlight(message) {
    console.log(chalk.cyan.bold(message));
}
export function muted(message) {
    console.log(chalk.gray(message));
}
export function newline(count = 1) {
    for (let i = 0; i < count; i++) {
        console.log();
    }
}
/**
 * The print module object — passed to commands via the toolbox.
 */
export const print = {
    info,
    success,
    warning,
    error,
    debug,
    highlight,
    muted,
    newline,
    colors: chalk,
    spin,
    table(rows, options) {
        console.log(renderTable(rows, options));
    },
    box(text, options) {
        console.log(renderBox(text, options));
    },
    ascii(text, options) {
        console.log(renderAscii(text, options));
    },
    tree(root, options) {
        console.log(renderTree(root, options));
    },
    keyValue(pairs, options) {
        console.log(renderKeyValue(pairs, options));
    },
    divider(options) {
        console.log(renderDivider(options));
    },
    progressBar,
};
//# sourceMappingURL=log.js.map