/**
 * Integration test - fetches real transcript from YouTube
 * Run locally only (not in CI - YouTube blocks runner IPs)
 *
 * Run with: npm run test:integration
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

import { findYouTubeUrls, extractVideoId } from "../youtube/detector.js";
import { fetchTranscript as ytFetchTranscript } from "youtube-transcript-plus";

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXAMPLE_FILE = resolve(__dirname, "./example.md");

// HTML entity patterns that should NOT appear in decoded text
const ENTITY_PATTERNS = [
  /&#\d+;/g,
  /&#x[a-fA-F0-9]+;/g,
  /&(amp|lt|gt|quot|apos|nbsp);/g,
];

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/**
 * Decode HTML/XML entities - same as in transcript.ts
 */
function decodeEntities(text: string): string {
  const decode = (input: string): string =>
    input.replace(
      /&(?:#(\d+)|#x([a-fA-F0-9]+)|(\w+));/g,
      (match: string, dec?: string, hex?: string, named?: string): string => {
        if (dec) return String.fromCharCode(parseInt(dec, 10));
        if (hex) return String.fromCharCode(parseInt(hex, 16));
        if (named && NAMED_ENTITIES[named]) return NAMED_ENTITIES[named];
        return match;
      },
    );

  return decode(decode(text));
}

function findUndecodedEntities(text: string): string[] {
  const found: string[] = [];
  for (const pattern of ENTITY_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) found.push(...matches);
  }
  return [...new Set(found)];
}

async function runTest(): Promise<void> {
  console.log("=".repeat(60));
  console.log("YouTube Transcript Test (using youtube-transcript-plus)");
  console.log("=".repeat(60));

  // Step 1: Read example.md and extract video ID
  console.log("\n[1] Reading example.md...");
  const content = readFileSync(EXAMPLE_FILE, "utf-8");
  console.log(`    File loaded (${content.length} chars)`);

  // Step 2: Use detector functions to find URL and extract video ID
  console.log("\n[2] Finding YouTube URL...");
  const urls = findYouTubeUrls(content);
  if (urls.length === 0) {
    console.error("    FAILED: No YouTube URLs found in example.md");
    process.exit(1);
  }
  console.log(`    Found: ${urls[0]}`);

  const videoId = extractVideoId(urls[0]!);
  if (!videoId) {
    console.error("    FAILED: Could not extract video ID");
    process.exit(1);
  }
  console.log(`    Video ID: ${videoId}`);

  // Step 3: Fetch transcript using the library
  console.log("\n[3] Fetching transcript using youtube-transcript-plus...");
  const rawEntries = await ytFetchTranscript(videoId, { lang: "en" });
  console.log(`    Fetched ${rawEntries.length} entries`);

  // Step 4: Apply our entity decoding (same as transcript.ts wrapper)
  console.log("\n[4] Decoding HTML entities...");
  const entries = rawEntries.map((entry) => ({
    ...entry,
    text: decodeEntities(entry.text),
  }));

  // Step 5: Check for undecoded entities
  console.log("\n[5] Checking for undecoded HTML entities...");
  const problems: Array<{ index: number; text: string; entities: string[] }> =
    [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (!entry) continue;
    const entities = findUndecodedEntities(entry.text);
    if (entities.length > 0) {
      problems.push({ index: i, text: entry.text, entities });
    }
  }

  if (problems.length > 0) {
    console.log("\n    FAILED: Found undecoded entities:");
    for (const p of problems.slice(0, 5)) {
      console.log(`    [${p.index}] "${p.text}"`);
      console.log(`         Entities: ${p.entities.join(", ")}`);
    }
    if (problems.length > 5)
      console.log(`    ... and ${problems.length - 5} more`);
    process.exit(1);
  }

  console.log("    PASSED: No undecoded entities found");

  // Step 6: Show sample output
  console.log("\n[6] Sample entries:");
  for (const entry of entries.slice(0, 3)) {
    if (entry) {
      console.log(`    [${entry.offset}ms] "${entry.text}"`);
    }
  }

  // Step 7: Verify entry structure
  console.log("\n[7] Verifying entry structure...");
  const firstEntry = entries[0];
  if (!firstEntry) {
    console.error("    FAILED: No entries returned");
    process.exit(1);
  }

  const hasRequiredFields =
    typeof firstEntry.text === "string" &&
    typeof firstEntry.offset === "number" &&
    typeof firstEntry.duration === "number";

  if (!hasRequiredFields) {
    console.error("    FAILED: Entry missing required fields");
    console.error(`    Got: ${JSON.stringify(firstEntry)}`);
    process.exit(1);
  }
  console.log("    PASSED: Entry has text, offset, and duration");

  // Step 8: Test decodeEntities function directly
  console.log("\n[8] Testing decodeEntities function...");
  const testCases = [
    { input: "Let&#39;s go", expected: "Let's go" },
    { input: "A &amp; B", expected: "A & B" },
    { input: "&lt;tag&gt;", expected: "<tag>" },
    { input: "&#60;&#62;", expected: "<>" },
    { input: "Normal text", expected: "Normal text" },
    { input: "&amp;#39;", expected: "'" }, // Double-encoded
  ];

  let allPassed = true;
  for (const { input, expected } of testCases) {
    const result = decodeEntities(input);
    const passed = result === expected;
    console.log(
      `    ${passed ? "✓" : "✗"} "${input}" → "${result}"${passed ? "" : ` (expected "${expected}")`}`,
    );
    if (!passed) allPassed = false;
  }

  if (!allPassed) {
    console.error("\n    FAILED: Some decode tests failed");
    process.exit(1);
  }

  console.log("\n" + "=".repeat(60));
  console.log("All tests passed");
  console.log("=".repeat(60));
}

runTest().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
