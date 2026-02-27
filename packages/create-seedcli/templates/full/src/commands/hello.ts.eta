import { command, arg, flag } from "@seedcli/core";

export default command({
	name: "hello",
	description: "Say hello",
	args: {
		name: arg({ type: "string", description: "Who to greet" }),
	},
	flags: {
		loud: flag({ type: "boolean", default: false, alias: "l", description: "SHOUT the greeting" }),
		timed: flag({ type: "boolean", default: false, alias: "t", description: "Show execution time" }),
	},
	run: async ({ args, flags, print, timer }) => {
		if (flags.timed) timer.start();

		const name = args.name ?? "World";
		const greeting = `Hello, ${name}!`;
		print.info(flags.loud ? greeting.toUpperCase() : greeting);

		if (flags.timed) print.muted(`Done in ${timer.stop()}`);
	},
});
