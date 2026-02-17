export interface TranscriptEntry {
  text: string;
  duration: number;
  offset: number;
  lang?: string;
}

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
