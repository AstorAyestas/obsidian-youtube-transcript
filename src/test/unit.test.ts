/**
 * Unit tests for YouTube Transcript plugin
 * No network calls - safe to run in CI
 *
 * Run with: npm test
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

import { findYouTubeUrls, extractVideoId } from "../youtube/detector.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXAMPLE_FILE = resolve(__dirname, "./example.md");

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

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

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number): string => n.toString().padStart(2, "0");
  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${minutes}:${pad(seconds)}`;
}

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`  ✗ ${name}`);
    console.log(`    ${message}`);
    failed++;
  }
}

function assertEqual<T>(actual: T, expected: T): void {
  if (actual !== expected) {
    throw new Error(`Expected "${expected}" but got "${actual}"`);
  }
}

function assertArrayEqual<T>(actual: T[], expected: T[]): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
  }
}

function runTests(): void {
  console.log("=".repeat(60));
  console.log("YouTube Transcript Unit Tests");
  console.log("=".repeat(60));

  // extractVideoId tests
  console.log("\n[extractVideoId]");

  test("extracts ID from youtube.com/watch URL", () => {
    assertEqual(extractVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  });

  test("extracts ID from youtu.be URL", () => {
    assertEqual(extractVideoId("https://youtu.be/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  });

  test("extracts ID from youtube.com/embed URL", () => {
    assertEqual(extractVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  });

  test("extracts ID from youtube.com/shorts URL", () => {
    assertEqual(extractVideoId("https://www.youtube.com/shorts/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  });

  test("returns null for invalid URL", () => {
    assertEqual(extractVideoId("https://example.com/video"), null);
  });

  test("returns null for empty string", () => {
    assertEqual(extractVideoId(""), null);
  });

  // findYouTubeUrls tests
  console.log("\n[findYouTubeUrls]");

  test("finds URL in frontmatter source field", () => {
    const content = `---
source: https://www.youtube.com/watch?v=abc12345678
---
Some content`;
    assertArrayEqual(findYouTubeUrls(content), ["https://www.youtube.com/watch?v=abc12345678"]);
  });

  test("finds URL in markdown link", () => {
    const content = "Check out [this video](https://www.youtube.com/watch?v=abc12345678)";
    assertArrayEqual(findYouTubeUrls(content), ["https://www.youtube.com/watch?v=abc12345678"]);
  });

  test("finds plain URL", () => {
    const content = "Watch this: https://www.youtube.com/watch?v=abc12345678";
    assertArrayEqual(findYouTubeUrls(content), ["https://www.youtube.com/watch?v=abc12345678"]);
  });

  test("finds youtu.be URL", () => {
    const content = "Short link: https://youtu.be/abc12345678";
    assertArrayEqual(findYouTubeUrls(content), ["https://youtu.be/abc12345678"]);
  });

  test("returns empty array when no URLs found", () => {
    const content = "No videos here, just text.";
    assertArrayEqual(findYouTubeUrls(content), []);
  });

  test("finds URL from example.md fixture", () => {
    const content = readFileSync(EXAMPLE_FILE, "utf-8");
    const urls = findYouTubeUrls(content);
    assertEqual(urls.length > 0, true);
    assertEqual(urls[0]?.includes("youtube"), true);
  });

  // decodeEntities tests
  console.log("\n[decodeEntities]");

  test("decodes numeric entity", () => {
    assertEqual(decodeEntities("Let&#39;s go"), "Let's go");
  });

  test("decodes named entity &amp;", () => {
    assertEqual(decodeEntities("A &amp; B"), "A & B");
  });

  test("decodes &lt; and &gt;", () => {
    assertEqual(decodeEntities("&lt;tag&gt;"), "<tag>");
  });

  test("decodes hex entity", () => {
    assertEqual(decodeEntities("&#x3C;&#x3E;"), "<>");
  });

  test("handles double-encoded entity", () => {
    assertEqual(decodeEntities("&amp;#39;"), "'");
  });

  test("leaves plain text unchanged", () => {
    assertEqual(decodeEntities("Normal text"), "Normal text");
  });

  // formatTimestamp tests
  console.log("\n[formatTimestamp]");

  test("formats seconds only", () => {
    assertEqual(formatTimestamp(45000), "0:45");
  });

  test("formats minutes and seconds", () => {
    assertEqual(formatTimestamp(125000), "2:05");
  });

  test("formats hours, minutes, seconds", () => {
    assertEqual(formatTimestamp(3665000), "1:01:05");
  });

  test("formats zero", () => {
    assertEqual(formatTimestamp(0), "0:00");
  });

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("=".repeat(60));

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
