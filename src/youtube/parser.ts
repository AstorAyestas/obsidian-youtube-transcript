import { TranscriptEntry } from "../types";

const RE_XML_TRANSCRIPT =
  /<text start="([^"]*)" dur="([^"]*)">([^<]*)<\/text>/g;

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

export function parseTranscriptXml(xml: string, lang: string): TranscriptEntry[] {
  const entries: TranscriptEntry[] = [];

  for (const match of xml.matchAll(RE_XML_TRANSCRIPT)) {
    const [, start, dur, text] = match;
    if (start && dur && text !== undefined) {
      entries.push({
        offset: parseFloat(start) * 1000,
        duration: parseFloat(dur) * 1000,
        text: decodeXmlEntities(text),
        lang,
      });
    }
  }

  if (entries.length === 0) {
    throw new Error("No transcript entries found in response.");
  }

  return entries;
}

export function decodeXmlEntities(text: string): string {
  const decode = (input: string): string =>
    input.replace(
      /&(?:#(\d+)|#x([a-fA-F0-9]+)|(\w+));/g,
      (match: string, dec?: string, hex?: string, named?: string): string => {
        if (dec) {
          return String.fromCharCode(parseInt(dec, 10));
        }
        if (hex) {
          return String.fromCharCode(parseInt(hex, 16));
        }
        if (named) {
          const entity = NAMED_ENTITIES[named];
          if (entity) return entity;
        }
        return match;
      },
    );

  // YouTube double-encodes entities (e.g., &amp;#39; instead of &#39;)
  // Decode twice to handle this
  return decode(decode(text));
}
