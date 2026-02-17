# YouTube Transcript for Obsidian

Grab transcripts from YouTube videos and add them to your notes.

## Pairs well with Obsidian Clipper

I built this to work alongside [Obsidian Clipper](https://obsidian.md/clipper). The typical workflow:

1. Use Clipper to save a YouTube video (grabs the title, URL, description)
2. Open that note and run **Fetch transcript**
3. Done. The full transcript is now in your note, ready to search or annotate.

## What it does

The plugin looks for YouTube URLs in your note—in the frontmatter `source` field, markdown links, embeds, or just pasted URLs. It handles youtube.com, youtu.be, and shorts links.

You can add timestamps (`[MM:SS]`) before each line or just get the text as a paragraph. There's a setting to change the section heading if you don't want `## Transcript`.

## Usage

1. Open a note with a YouTube URL
2. Run **Fetch transcript** from the command palette (`Cmd/Ctrl + P`)
3. The transcript appears at the end of your note

### Example

You clip a video with Obsidian Clipper:

```markdown
---
title: My Video Notes
source: https://www.youtube.com/watch?v=dQw4w9WgXcQ
author: Channel Name
published: 2024-01-15
---

Video description from YouTube...
```

After running the command:

```markdown
---
title: My Video Notes
source: https://www.youtube.com/watch?v=dQw4w9WgXcQ
author: Channel Name
published: 2024-01-15
---

Video description from YouTube...

## Transcript

We're no strangers to love You know the rules and so do I...
```

## Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Language | Language code like `en`, `es`, `fr` | `en` |
| Include timestamps | Adds `[MM:SS]` before each line | Off |
| Section heading | What heading to use | `## Transcript` |

## Installation

**Community plugins:** Settings → Community plugins → Browse → search "YouTube Transcript" → Install → Enable

**Manual:** Download `main.js` and `manifest.json` from releases, drop them in `<vault>/.obsidian/plugins/youtube-transcript/`, reload Obsidian.

## Development

```bash
npm install
npm run dev      # watch mode
npm run build    # production build
npx eslint ./src/
npx tsx src/test/transcript.test.ts
```

## How it works

The plugin calls YouTube's player API (the same one their mobile app uses) to get caption track URLs. It downloads the XML transcript, decodes the HTML entities, and formats it as text.

If a video has multiple languages, it picks the one matching your language setting, or falls back to whatever's available.

## Limitations

- Needs internet access
- Only works if the video has captions (auto-generated or manual)
- Auto-generated captions can be rough
- Some creators disable captions entirely

## Privacy

The plugin only talks to YouTube. No analytics, no tracking, no data collection. It reads your note to find the URL, fetches the transcript, and writes to that same note. That's it.

## License

MIT License - Copyright (c) 2026 Astor Ayestas

See [LICENSE](LICENSE) for the full text.

## Author

Astor Ayestas
