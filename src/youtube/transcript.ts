import { requestUrl } from "obsidian";
import { TranscriptEntry } from "../types";
import { parseTranscriptXml } from "./parser";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

interface CaptionTrack {
  baseUrl?: string;
  url?: string;
  languageCode: string;
}

interface PlayerCaptionsTracklist {
  captionTracks?: CaptionTrack[];
}

interface PlayerResponse {
  captions?: {
    playerCaptionsTracklistRenderer?: PlayerCaptionsTracklist;
  };
  playerCaptionsTracklistRenderer?: PlayerCaptionsTracklist;
  playabilityStatus?: {
    status?: string;
  };
}

/**
 * Fetch transcript using YouTube's innertube player API with ANDROID client
 */
export async function fetchTranscript(
  videoId: string,
  lang = "en",
): Promise<TranscriptEntry[]> {
  const apiKey = await extractApiKey(videoId, lang);
  const tracks = await fetchCaptionTracks(videoId, apiKey);
  const track = selectTrack(tracks, lang);
  const xml = await fetchTranscriptXml(track, lang);
  return parseTranscriptXml(xml, track.languageCode);
}

async function extractApiKey(videoId: string, lang: string): Promise<string> {
  const response = await requestUrl({
    url: `https://www.youtube.com/watch?v=${videoId}`,
    headers: { "User-Agent": USER_AGENT, "Accept-Language": lang },
  });

  if (response.text.includes('class="g-recaptcha"')) {
    throw new Error("YouTube is receiving too many requests. Try again later.");
  }

  const match =
    response.text.match(/"INNERTUBE_API_KEY":"([^"]+)"/) ||
    response.text.match(/INNERTUBE_API_KEY\\":\\"([^\\"]+)\\"/);

  if (!match?.[1]) {
    throw new Error(
      "Could not find YouTube API key. Video may not be available.",
    );
  }

  return match[1];
}

async function fetchCaptionTracks(
  videoId: string,
  apiKey: string,
): Promise<CaptionTrack[]> {
  const response = await requestUrl({
    url: `https://www.youtube.com/youtubei/v1/player?key=${apiKey}`,
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": USER_AGENT },
    body: JSON.stringify({
      context: { client: { clientName: "ANDROID", clientVersion: "20.10.38" } },
      videoId,
    }),
  });

  if (response.status !== 200) {
    throw new Error("Failed to fetch video information from YouTube.");
  }

  const json = response.json as PlayerResponse;
  const tracklist =
    json.captions?.playerCaptionsTracklistRenderer ??
    json.playerCaptionsTracklistRenderer;

  if (!json.captions || !tracklist) {
    const isPlayable = json.playabilityStatus?.status === "OK";
    throw new Error(
      isPlayable
        ? "Transcripts are disabled for this video."
        : "No transcripts available for this video.",
    );
  }

  const tracks = tracklist.captionTracks;
  if (!Array.isArray(tracks) || tracks.length === 0) {
    throw new Error("No caption tracks found for this video.");
  }

  return tracks;
}

function selectTrack(tracks: CaptionTrack[], lang: string): CaptionTrack {
  // Try exact match, then base language, then first available
  let track = tracks.find((t) => t.languageCode === lang);

  if (!track) {
    const baseLang = lang.split("-")[0] ?? lang;
    track = tracks.find((t) => t.languageCode.startsWith(baseLang));
  }

  if (!track) {
    track = tracks[0];
  }

  if (!track) {
    throw new Error("No suitable caption track found.");
  }

  return track;
}

async function fetchTranscriptXml(
  track: CaptionTrack,
  lang: string,
): Promise<string> {
  const url = track.baseUrl || track.url;
  if (!url) {
    throw new Error("No transcript URL found in caption track.");
  }

  // Remove fmt parameter to get XML format
  const transcriptUrl = url.replace(/&fmt=[^&]+/, "");

  const response = await requestUrl({
    url: transcriptUrl,
    headers: { "User-Agent": USER_AGENT, "Accept-Language": lang },
  });

  if (response.status === 429) {
    throw new Error("Too many requests. Please try again later.");
  }

  if (response.status !== 200 || !response.text) {
    throw new Error("Failed to fetch transcript from YouTube.");
  }

  return response.text;
}
