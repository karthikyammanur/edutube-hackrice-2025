import { BaseRetriever } from "@langchain/core/retrievers";
import { Document } from "@langchain/core/documents";

type TwelveLabsSearchItem = {
  id?: string;
  text?: string;
  score?: number;
  start?: number;
  end?: number;
  metadata?: Record<string, unknown>;
};

interface TwelveLabsSearchParams {
  query: string;
  indexId: string;
  videoId?: string;
  topK?: number;
  minScore?: number;
  timeoutMs?: number;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} env var is required`);
  return v;
}

export class TwelveLabsRetriever extends BaseRetriever {
  lc_namespace = ["twelvelabs", "retrievers"];
  
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly indexId: string;
  private readonly videoId?: string;

  constructor({ indexId, videoId }: { indexId: string; videoId?: string }) {
    super();
    this.apiKey = requireEnv("TWELVELABS_API_KEY");
    this.baseUrl =
      process.env.TWELVELABS_BASE_URL || "https://api.twelvelabs.io/v1";
    this.indexId = indexId;
    this.videoId = videoId;
  }

  async _getRelevantDocuments(query: string): Promise<Document[]> {
    const items = await this.search({
      query,
      indexId: this.indexId,
      videoId: this.videoId,
      topK: 5,
      minScore: 0.2,
      timeoutMs: 15_000,
    });

    return items.map((it, i) =>
      new Document({
        pageContent: (it.text ?? "").trim() || "(no transcript available)",
        metadata: {
          source: "twelvelabs",
          indexId: this.indexId,
          videoId: this.videoId,
          hitId: it.id ?? `hit-${i}`,
          score: it.score ?? null,
          start: it.start ?? null,
          end: it.end ?? null,
          ...(it.metadata ?? {}),
        },
      })
    );
  }

  async search(params: TwelveLabsSearchParams): Promise<TwelveLabsSearchItem[]> {
    const {
      query,
      indexId,
      videoId,
      topK = 5,
      minScore = 0,
      timeoutMs = 15_000,
    } = params;

    const url = new URL(`${this.baseUrl}/indexes/${indexId}/search`);
    const body: Record<string, unknown> = {
      query,
      topK,
      // add other options supported by your TL plan, e.g.:
      // granularity: "clip",
      // return: ["start","end","text","scene","ocr","objects"]
    };
    if (videoId) body.video_id = videoId;

    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);

    const res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Most TL REST endpoints use x-api-key:
        "x-api-key": this.apiKey,
      },
      body: JSON.stringify(body),
      signal: ac.signal,
    }).catch((e) => {
      clearTimeout(t);
      throw e;
    });
    clearTimeout(t);

    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      throw new Error(
        `TwelveLabs search failed: ${res.status} ${res.statusText} - ${msg}`
      );
    }

    const json = (await res.json()) as
      | { results?: TwelveLabsSearchItem[] }
      | TwelveLabsSearchItem[];

    const results = Array.isArray(json) ? json : json.results ?? [];
    return results
      .filter((h) => (h.score ?? 0) >= minScore)
      .slice(0, topK)
      .map((h) => ({
        id: h.id,
        text: h.text ?? "",
        score: h.score,
        start: h.start,
        end: h.end,
        metadata: h.metadata ?? {},
      }));
  }
}
