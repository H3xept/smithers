import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "bun:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readme = readFileSync(join(root, "README.md"), "utf8");

describe("README public examples", () => {
  test("hero visual is the time-travel fork, not out-of-scope Studio wording", () => {
    expect(readme).toContain(
      "Forking a Smithers run from an earlier frame to branch an alternate timeline",
    );
    expect(readme).not.toContain("![Live runs in Smithers Studio:");
  });

  test("workflow example promotes Loop instead of deprecated Ralph", () => {
    expect(readme).toContain(
      '<Loop until={ctx.latest(outputs.review, "validate")?.approved} maxIterations={5}>',
    );
    expect(readme).toContain("</Loop>");
    expect(readme).not.toContain("<Ralph until=");
    expect(readme).not.toContain("</Ralph>");
  });
});
