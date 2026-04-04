import { defineCommand } from "citty";
import { bold, cyan, green, dim, yellow } from "../../utils/colors.js";
import { exists, text } from "../../utils/fs.js";
import { print } from "../../utils/logging.js";
import { dockerTemplates } from "../templates/index.js";
import { runtime } from "../../runtime/index.js";
import * as pm from "../../pm/index.js";

async function fetchDockerVersion(repo: string, fallback: string): Promise<string> {
  try {
    const path = repo.includes("/") ? repo : `library/${repo}`;
    const res = await fetch(
      `https://hub.docker.com/v2/repositories/${path}/tags?page_size=10&name=alpine&ordering=-last_updated`
    );
    const body = (await res.json()) as { results: Array<{ name: string }> };
    const pattern = /^(\d+\.\d+\.\d+)-alpine$/;
    const found = body.results
      .filter((t) => pattern.test(t.name))
      .sort((a, b) => {
        const av = a.name.replace("-alpine", "").split(".").map(Number) as [number, number, number];
        const bv = b.name.replace("-alpine", "").split(".").map(Number) as [number, number, number];
        for (let i = 0; i < 3; i++) if (av[i] !== bv[i]) return bv[i]! - av[i]!;
        return 0;
      });
    return found[0]?.name.replace("-alpine", "") ?? fallback;
  } catch {
    return fallback;
  }
}

async function handle() {
  const detected = pm.detect();
  const berry = detected === "yarn" && pm.isYarnBerry();
  const destPath = "Dockerfile";

  if (exists(destPath)) {
    process.stderr.write(`  ${yellow("!")} Dockerfile already exists\n`);
    process.exit(1);
  }

  const rt = runtime.detect();
  const repo = rt === "bun" ? "oven/bun" : "node";
  const fallback = rt === "bun" ? "latest" : "lts";
  const version = runtime.detect.version() ?? (await fetchDockerVersion(repo, fallback));

  const content = berry ? dockerTemplates.berry({ version }) : dockerTemplates[detected]({ version });
  text.write(destPath, content);

  const label = berry ? "yarn berry" : detected;
  print(
    "",
    `  ${green("✔")} Created ${bold(cyan("Dockerfile"))} for ${bold(label)}`,
    "",
    `  ${dim("Tip:")} build with ${cyan("docker build -t my-app .")}`,
    ""
  );
}

export const dockerfile = defineCommand({
  meta: { name: "dockerfile", description: "Generate a Dockerfile (auto-detects bun or node runtime)" },
  run: handle,
});
