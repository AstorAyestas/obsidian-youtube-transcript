import { requestUrl } from "obsidian";
import { fetchTranscript as ytFetchTranscript } from "youtube-transcript-plus";
import type { TranscriptResponse, FetchParams } from "youtube-transcript-plus";

export type { TranscriptResponse };

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/**
 * Decode HTML/XML entities in text
 * YouTube double-encodes entities, so we decode twice
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

  // Decode twice to handle double-encoded entities
  return decode(decode(text));
}

/**
 * Fetch wrapper using Obsidian's requestUrl for youtube-transcript-plus
 */
async function obsidianFetch(params: FetchParams): Promise<Response> {
  const response = await requestUrl({
    url: params.url,
    method: params.method || "GET",
    headers: {
      "User-Agent": params.userAgent || USER_AGENT,
      ...(params.lang && { "Accept-Language": params.lang }),
      ...params.headers,
    },
    body: params.body,
  });

  return {
    ok: response.status >= 200 && response.status < 300,
    status: response.status,
    text: async () => response.text,
    json: async () => response.json as unknown,
  } as Response;
}

/**
 * Fetch transcript using youtube-transcript-plus library
 * with Obsidian's requestUrl for network requests
 */
export async function fetchTranscript(
  videoId: string,
  lang = "en",
): Promise<TranscriptResponse[]> {
  const transcript = await ytFetchTranscript(videoId, {
    lang,
    userAgent: USER_AGENT,
    videoFetch: obsidianFetch,
    playerFetch: obsidianFetch,
    transcriptFetch: obsidianFetch,
  });

  // Decode HTML entities in transcript text
  return transcript.map((entry) => ({
    ...entry,
    text: decodeEntities(entry.text),
  }));
}
