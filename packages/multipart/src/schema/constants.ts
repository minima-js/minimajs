import { tmpdir } from "node:os";
import { join } from "node:path";

export const TMP_DIR = join(tmpdir(), "minimajs/multipart");
