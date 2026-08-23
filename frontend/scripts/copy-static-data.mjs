import { cp, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const frontendDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryDir = resolve(frontendDir, "..");
const source = resolve(repositoryDir, "docs", "data");
const destination = resolve(frontendDir, "public", "data");
const gamesSource = resolve(repositoryDir, "docs", "games");
const gamesDestination = resolve(frontendDir, "public", "games");
const stylesSource = resolve(repositoryDir, "docs", "styles.css");
const stylesDestination = resolve(frontendDir, "public", "styles.css");

await mkdir(destination, { recursive: true });
await mkdir(gamesDestination, { recursive: true });
await cp(source, destination, { recursive: true });
await cp(gamesSource, gamesDestination, { recursive: true });
await cp(stylesSource, stylesDestination);
console.log(`Copied static data and legacy mini-game assets into ${frontendDir}/public`);
