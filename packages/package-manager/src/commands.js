const COMMANDS = {
    bun: {
        install: "bun install",
        add: "bun add",
        addDev: ["bun", "add", "-d"],
        remove: "bun remove",
        run: "bun run",
    },
    npm: {
        install: "npm install",
        add: "npm install",
        addDev: ["npm", "install", "--save-dev"],
        remove: "npm uninstall",
        run: "npm run",
    },
    yarn: {
        install: "yarn install",
        add: "yarn add",
        addDev: ["yarn", "add", "--dev"],
        remove: "yarn remove",
        run: "yarn run",
    },
    pnpm: {
        install: "pnpm install",
        add: "pnpm add",
        addDev: ["pnpm", "add", "-D"],
        remove: "pnpm remove",
        run: "pnpm run",
    },
};
export function getCommands(name) {
    return COMMANDS[name];
}
//# sourceMappingURL=commands.js.map