/**
 * Test for YouTube transcript fetching and HTML entity decoding
 *
 * Uses example.md as the test input and functions from src/youtube/
 * Run with: npx tsx src/test/transcript.test.ts
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

import { findYouTubeUrls, extractVideoId } from "../youtube/detector.js";
import { parseTranscriptXml, decodeXmlEntities } from "../youtube/parser.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXAMPLE_FILE = resolve(__dirname, "./example.md");

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// HTML entity patterns that should NOT appear in decoded text
const ENTITY_PATTERNS = [
  /&#\d+;/g,
  /&#x[a-fA-F0-9]+;/g,
  /&(amp|lt|gt|quot|apos|nbsp);/g,
];

interface PlayerResponse {
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: Array<{ baseUrl?: string; languageCode?: string }>;
    };
  };
}

function findUndecodedEntities(text: string): string[] {
  const found: string[] = [];
  for (const pattern of ENTITY_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) found.push(...matches);
  }
  return [...new Set(found)];
}

async function fetchTranscriptXml(
  videoId: string,
): Promise<{ xml: string; lang: string }> {
  // Get API key from watch page
  const watchRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: { "User-Agent": USER_AGENT },
  });
  const html = await watchRes.text();

  const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
  if (!apiKeyMatch?.[1]) throw new Error("Could not find API key");

  // Get caption tracks from player API
  const playerRes = await fetch(
    `https://www.youtube.com/youtubei/v1/player?key=${apiKeyMatch[1]}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": USER_AGENT },
      body: JSON.stringify({
        context: {
          client: { clientName: "ANDROID", clientVersion: "20.10.38" },
        },
        videoId,
      }),
    },
  );

  const player = (await playerRes.json()) as PlayerResponse;
  const tracks =
    player.captions?.playerCaptionsTracklistRenderer?.captionTracks;

  if (!tracks?.length) throw new Error("No caption tracks found");

  const track = tracks[0];
  if (!track?.baseUrl) throw new Error("No baseUrl in track");

  // Fetch transcript XML
  const transcriptUrl = track.baseUrl.replace(/&fmt=[^&]+/, "");
  const transcriptRes = await fetch(transcriptUrl, {
    headers: { "User-Agent": USER_AGENT },
  });

  return {
    xml: await transcriptRes.text(),
    lang: track.languageCode ?? "en",
  };
}

async function runTest(): Promise<void> {
  console.log("=".repeat(60));
  console.log("YouTube Transcript Test");
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

  // Step 3: Fetch transcript XML
  console.log("\n[3] Fetching transcript from YouTube...");
  const { xml, lang } = await fetchTranscriptXml(videoId);
  console.log(`    XML received (${xml.length} chars, lang: ${lang})`);

  // Step 4: Parse using the actual parseTranscriptXml function
  console.log("\n[4] Parsing transcript...");
  const entries = parseTranscriptXml(xml, lang);
  console.log(`    Parsed ${entries.length} entries`);

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
    if (entry) console.log(`    "${entry.text}"`);
  }

  // Step 7: Test decodeXmlEntities directly
  console.log("\n[7] Testing decodeXmlEntities function...");
  const testCases = [
    { input: "Let&amp;#39;s go", expected: "Let's go" },
    { input: "A &amp; B", expected: "A & B" },
    { input: "&lt;tag&gt;", expected: "<tag>" },
    { input: "&#60;&#62;", expected: "<>" },
    { input: "Normal text", expected: "Normal text" },
  ];

  let allPassed = true;
  for (const { input, expected } of testCases) {
    const result = decodeXmlEntities(input);
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
