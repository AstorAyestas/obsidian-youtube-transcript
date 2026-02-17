import { Notice, Plugin, MarkdownView } from "obsidian";
import {
  YouTubeTranscriptSettings,
  DEFAULT_SETTINGS,
  YouTubeTranscriptSettingTab,
} from "./settings";
import { findYouTubeUrls, extractVideoId } from "./youtube/detector";
import { fetchTranscript } from "./youtube/transcript";
import { formatTranscript, hasTranscriptSection } from "./youtube/formatter";

export default class YouTubeTranscriptPlugin extends Plugin {
  settings: YouTubeTranscriptSettings;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.addCommand({
      id: "fetch-transcript",
      name: "Fetch transcript",
      checkCallback: (checking: boolean) => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view) return false;
        if (!checking) void this.fetchTranscriptForCurrentNote();
        return true;
      },
    });

    this.addSettingTab(new YouTubeTranscriptSettingTab(this.app, this));
  }

  async fetchTranscriptForCurrentNote(): Promise<void> {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view?.file) {
      new Notice("No active Markdown file");
      return;
    }

    const file = view.file;
    const content = await this.app.vault.read(file);

    if (hasTranscriptSection(content, this.settings.sectionHeading)) {
      new Notice("This note already has a transcript section");
      return;
    }

    const urls = findYouTubeUrls(content);
    const firstUrl = urls[0];
    if (!firstUrl) {
      new Notice("No YouTube URL found in this note");
      return;
    }

    const videoId = extractVideoId(firstUrl);
    if (!videoId) {
      new Notice("Could not extract video ID from URL");
      return;
    }

    new Notice("Fetching transcript...");

    try {
      const transcript = await fetchTranscript(
        videoId,
        this.settings.language || "en",
      );

      if (transcript.length === 0) {
        new Notice("No transcript entries found");
        return;
      }

      const formatted = formatTranscript(transcript, {
        includeTimestamps: this.settings.includeTimestamps,
        sectionHeading: this.settings.sectionHeading,
      });

      await this.app.vault.modify(file, content + "\n" + formatted);
      new Notice(`Transcript added (${transcript.length} entries)`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      new Notice(`Failed to fetch transcript: ${message}`);
    }
  }

  onunload(): void {}

  async loadSettings(): Promise<void> {
    this.settings = Object.assign(
      {},
      DEFAULT_SETTINGS,
      (await this.loadData()) as YouTubeTranscriptSettings | undefined,
    );
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}
