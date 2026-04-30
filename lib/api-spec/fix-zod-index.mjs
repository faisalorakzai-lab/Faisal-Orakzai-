import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexPath = resolve(__dirname, "../../lib/api-zod/src/index.ts");
writeFileSync(indexPath, 'export * from "./generated/api";\n');
console.log("Fixed api-zod index.ts");
