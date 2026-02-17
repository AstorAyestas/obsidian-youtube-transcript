import { App, PluginSettingTab, Setting } from "obsidian";
import YouTubeTranscriptPlugin from "./main";
import { YouTubeTranscriptSettings, DEFAULT_SETTINGS } from "./types";

export type { YouTubeTranscriptSettings };
export { DEFAULT_SETTINGS };

export class YouTubeTranscriptSettingTab extends PluginSettingTab {
  plugin: YouTubeTranscriptPlugin;

  constructor(app: App, plugin: YouTubeTranscriptPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Language")
      .setDesc("Preferred language for transcripts (e.g., en, es, fr, de)")
      .addText((text) =>
        text
          // eslint-disable-next-line obsidianmd/ui/sentence-case
          .setPlaceholder("en")
          .setValue(this.plugin.settings.language)
          .onChange(async (value) => {
            this.plugin.settings.language = value || "en";
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Include timestamps")
      // eslint-disable-next-line obsidianmd/ui/sentence-case
      .setDesc("Add [MM:SS] timestamps before each transcript line")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.includeTimestamps)
          .onChange(async (value) => {
            this.plugin.settings.includeTimestamps = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Section heading")
      .setDesc("Heading to use for the transcript section")
      .addText((text) =>
        text
          // eslint-disable-next-line obsidianmd/ui/sentence-case
          .setPlaceholder("## Transcript")
          .setValue(this.plugin.settings.sectionHeading)
          .onChange(async (value) => {
            this.plugin.settings.sectionHeading = value || "## Transcript";
            await this.plugin.saveSettings();
          }),
      );
  }
}
