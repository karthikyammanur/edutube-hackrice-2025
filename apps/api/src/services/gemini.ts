import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} env var is required`);
  return v;
}

export class GeminiService {
  private readonly model: ChatGoogleGenerativeAI;

  constructor(params?: { model?: string; temperature?: number }) {
    const apiKey = requireEnv('GOOGLE_API_KEY');
    this.model = new ChatGoogleGenerativeAI({
      apiKey,
      model: params?.model ?? 'gemini-1.5-pro',
      temperature: params?.temperature ?? 0.2,
    });
  }

  async summarize(context: string, instruction = 'Summarize the following content into clear, concise study notes:') {
    const res = await this.model.invoke([
      ["system", instruction],
      ["human", context],
    ]);
    return res?.content?.toString?.() ?? String(res);
  }
}
