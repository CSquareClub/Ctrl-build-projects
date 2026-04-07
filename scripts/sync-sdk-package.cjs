const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const source = path.join(root, "public", "agenticpulse.js");
const targetDir = path.join(root, "packages", "agenticpulse-sdk", "dist");
const target = path.join(targetDir, "agenticpulse.js");

if (!fs.existsSync(source)) {
  throw new Error(`SDK source not found: ${source}`);
}

fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(source, target);

console.log(`Synced SDK bundle to ${target}`);
