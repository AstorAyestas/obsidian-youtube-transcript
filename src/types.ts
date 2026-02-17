export type { TranscriptResponse as TranscriptEntry } from "youtube-transcript-plus";

export interface YouTubeTranscriptSettings {
  language: string;
  includeTimestamps: boolean;
  sectionHeading: string;
}

export const DEFAULT_SETTINGS: YouTubeTranscriptSettings = {
  language: "en",
  includeTimestamps: false,
  sectionHeading: "## Transcript",
};
