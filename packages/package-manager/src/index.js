export { getCommands } from "./commands.js";
export { detect } from "./detect.js";
export { create } from "./manager.js";
import { detect } from "./detect.js";
import { create } from "./manager.js";
export async function install(packages, options) {
    const pm = await create(await detect(options?.cwd));
    await pm.install(packages, options);
}
export async function installDev(packages, options) {
    const pm = await create(await detect(options?.cwd));
    await pm.installDev(packages, options);
}
export async function remove(packages, options) {
    const pm = await create(await detect(options?.cwd));
    await pm.remove(packages, options);
}
export async function run(script, options) {
    const pm = await create(await detect(options?.cwd));
    await pm.run(script, options);
}
//# sourceMappingURL=index.js.map