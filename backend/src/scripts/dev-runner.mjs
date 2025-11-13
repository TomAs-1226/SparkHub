// scripts/dev-runner.mjs
import { existsSync } from "fs";
import { spawn } from "child_process";
import path from "path";
import process from "process";

const CWD = process.cwd();
const candidates = [
    // TS entries (if your project actually uses TS)
    "src/index.ts", "src/server.ts", "src/app.ts", "src/main.ts",
    // JS entries (your case)
    "src/index.js", "src/server.js", "src/app.js", "src/main.js",
];

const entry = candidates.find((p) => existsSync(path.join(CWD, p)));
if (!entry) {
    console.error("❌ Could not find an entry file. Looked for:");
    console.error(candidates.map((c) => ` - ${c}`).join("\n"));
    process.exit(1);
}

const isTS = entry.endsWith(".ts");

const cmd = "node";
const args = isTS
    ? ["-r", "ts-node/register/transpile-only", "--enable-source-maps", entry]
    : ["--enable-source-maps", entry];

// Helpful hint if TS entry found but ts-node not installed
if (isTS) {
    try {
        require.resolve("ts-node/register/transpile-only");
    } catch {
        console.error("❌ A TypeScript entry was found but ts-node is not installed.");
        console.error("   Install dev deps:  npm i -D ts-node typescript @types/node");
        process.exit(1);
    }
}

console.log(`▶️  Starting ${entry} (${isTS ? "TypeScript" : "JavaScript"})`);
const child = spawn(cmd, args, { stdio: "inherit", env: process.env });
child.on("close", (code) => process.exit(code ?? 0));