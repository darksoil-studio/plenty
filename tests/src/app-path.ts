import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const appPath =
  dirname(fileURLToPath(import.meta.url)) + "/../../workdir/plenty.happ";
