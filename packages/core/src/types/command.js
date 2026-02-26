// ─── Command Factory ───
/**
 * Define a command with full type inference for args and flags.
 *
 * ```ts
 * const greet = command({
 *   name: "greet",
 *   args: {
 *     name: arg({ type: "string", required: true }),
 *   },
 *   flags: {
 *     loud: flag({ type: "boolean", default: false }),
 *   },
 *   run: async ({ args, flags, print }) => {
 *     // args.name: string (inferred as required)
 *     // flags.loud: boolean (inferred from default)
 *     const msg = `Hello, ${args.name}!`;
 *     print.info(flags.loud ? msg.toUpperCase() : msg);
 *   },
 * });
 * ```
 */
export function command(config) {
    return config;
}
//# sourceMappingURL=command.js.map