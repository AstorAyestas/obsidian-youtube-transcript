const VIDEO_ID_PATTERNS = [
  /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
  /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
  /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
];

export function extractVideoId(url: string): string | null {
  for (const pattern of VIDEO_ID_PATTERNS) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

export function findYouTubeUrls(content: string): string[] {
  const urls: string[] = [];

  const addUrl = (url: string | undefined): void => {
    if (url && !urls.includes(url)) {
      urls.push(url.replace(/[),.\]>]+$/, ""));
    }
  };

  // Frontmatter source field
  const frontmatter = content.match(/^---\n([\s\S]*?)\n---/)?.[1];
  if (frontmatter) {
    const source = frontmatter.match(
      /source:\s*["']?(https?:\/\/[^\s"'\n]+youtube[^\s"'\n]+)["']?/,
    );
    addUrl(source?.[1]);
  }

  // Markdown embeds and links: ![](url) or [text](url)
  const markdownPattern =
    /!?\[.*?\]\((https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)[^\s)]+)\)/g;
  for (const match of content.matchAll(markdownPattern)) {
    addUrl(match[1]);
  }

  // Plain URLs
  const plainPattern =
    /(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11}[^\s)\]>]*)/g;
  for (const match of content.matchAll(plainPattern)) {
    addUrl(match[1]);
  }

  return urls;
}
