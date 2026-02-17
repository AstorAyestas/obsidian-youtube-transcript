import { TranscriptEntry } from "../types";

interface FormatOptions {
  includeTimestamps: boolean;
  sectionHeading: string;
}

export function formatTranscript(
  entries: TranscriptEntry[],
  options: FormatOptions,
): string {
  if (options.includeTimestamps) {
    const lines = entries.map(
      (entry) => `[${formatTimestamp(entry.offset)}] ${entry.text}`,
    );
    return `\n${options.sectionHeading}\n\n${lines.join("\n")}`;
  }

  // Join as continuous paragraph without timestamps
  const paragraph = entries.map((entry) => entry.text).join(" ");
  return `\n${options.sectionHeading}\n\n${paragraph}`;
}

export function hasTranscriptSection(
  content: string,
  sectionHeading: string,
): boolean {
  return content.includes(sectionHeading);
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
