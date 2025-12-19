/**
 * Script to fix chunk loading issues by clearing all Next.js caches
 */

const fs = require("fs");
const path = require("path");

const pathsToClean = [
  path.join(process.cwd(), ".next"),
  path.join(process.cwd(), ".next/cache"),
  path.join(process.cwd(), "node_modules/.cache"),
];

console.log("🧹 Cleaning Next.js build caches...\n");

pathsToClean.forEach((dir) => {
  if (fs.existsSync(dir)) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`✅ Removed: ${path.basename(dir)}`);
    } catch (error) {
      console.error(`❌ Failed to remove ${dir}:`, error.message);
    }
  } else {
    console.log(`⚠️  Not found: ${path.basename(dir)}`);
  }
});

console.log("\n✅ Cache cleanup complete!");
console.log("📋 Next steps:");
console.log("   1. Stop the dev server (Ctrl+C)");
console.log("   2. Run 'npm run dev' again");
console.log("   3. Hard refresh the browser (Ctrl+Shift+R)");

