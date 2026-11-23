import type { LlmProvider, LlmRequest, LlmResponse, StopReason } from './provider.js';

export const DEFAULT_OLLAMA_MODEL = 'qwen3.5:2b-q4_K_M';

export interface OllamaOptions {
  model?: string;
  host?: string;
  keepAlive?: string;
  numCtx?: number;
  numThread?: number;
  numGpu?: number;
}

interface OllamaGenerateResponse {
  response?: string;
  model?: string;
  done_reason?: string;
  prompt_eval_count?: number;
  eval_count?: number;
}

function mapDoneReason(reason: string | undefined): StopReason {
  switch (reason) {
    case 'stop': return 'end_turn';
    case 'length': return 'max_tokens';
    default: return 'other';
  }
}

// Local Ollama adapter. It deliberately uses the native REST API instead of an OpenAI-compatible
// shim, keeping the local endpoint, CPU settings, and non-thinking mode explicit.
export class OllamaProvider implements LlmProvider {
  readonly name = 'ollama';
  readonly model: string;
  private readonly host: string;
  private readonly keepAlive: string;
  private readonly numCtx: number;
  private readonly numThread: number;
  private readonly numGpu: number;

  constructor(opts: OllamaOptions = {}) {
    this.model = opts.model ?? DEFAULT_OLLAMA_MODEL;
    this.host = (opts.host ?? process.env.OLLAMA_HOST ?? 'http://127.0.0.1:11434').replace(/\/$/, '');
    this.keepAlive = opts.keepAlive ?? '0';
    this.numCtx = opts.numCtx ?? 2048;
    this.numThread = opts.numThread ?? 4;
    this.numGpu = opts.numGpu ?? 0;
  }

  async complete(req: LlmRequest): Promise<LlmResponse> {
    const response = await fetch(`${this.host}/api/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        system: req.system,
        prompt: req.user,
        stream: false,
        think: false,
        keep_alive: this.keepAlive,
        // Safety defaults are deliberately CPU-only and conservative. Ollama 0.40.17's scheduler
        // treats num_gpu=0 as an empty GPU list rather than running device discovery for this load.
        options: {
          num_ctx: this.numCtx,
          num_predict: req.maxTokens,
          num_thread: this.numThread,
          num_gpu: this.numGpu,
        },
      }),
    });
    if (!response.ok) throw new Error(`Ollama API ${response.status}: ${await response.text()}`);
    const body = await response.json() as OllamaGenerateResponse;
    return {
      text: body.response ?? '',
      model: body.model ?? this.model,
      stopReason: mapDoneReason(body.done_reason),
      usage: {
        inputTokens: body.prompt_eval_count ?? 0,
        outputTokens: body.eval_count ?? 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      },
    };
  }
}
