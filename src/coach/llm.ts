/**
 * Optional in-browser LLM (WebLLM + WebGPU). Runs entirely on the user's GPU:
 * the model (~1 GB) downloads once from Hugging Face and stays in the browser cache.
 * It only rephrases and expands the grounded answer built from the game data.
 */
import type { MLCEngine } from '@mlc-ai/web-llm';

export const MODEL_ID = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC';
export const hasWebGpu = () => typeof navigator !== 'undefined' && 'gpu' in navigator;

let engine: Promise<MLCEngine> | null = null;
export function loadLlm(onProgress: (text: string, ratio: number) => void): Promise<MLCEngine> {
  engine ??= import('@mlc-ai/web-llm')
    .then(webllm => webllm.CreateMLCEngine(MODEL_ID, { initProgressCallback: report => onProgress(report.text, report.progress) }))
    .catch(error => { engine = null; throw error; });
  return engine;
}

const SYSTEM = `Eres el entrenador de ajedrez de GodChess y hablas con un jugador principiante o intermedio.
Responde siempre en español, de forma clara y breve (como mucho 170 palabras), en tono cercano.
Usa SOLO la información de los DATOS y de la RESPUESTA BASE. No inventes jugadas, evaluaciones ni nombres.
Escribe las jugadas exactamente como aparecen (por ejemplo 13.Qg4). Si los datos no bastan para responder, dilo y sugiere analizar la partida.
Termina con un consejo práctico concreto cuando la pregunta sea sobre mejorar.`;

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

export async function* askLlm(llm: MLCEngine, question: string, data: string, draft: string, history: ChatTurn[]) {
  const messages = [
    { role: 'system' as const, content: `${SYSTEM}\n\nDATOS:\n${data || '(sin datos de partidas todavía)'}` },
    ...history.slice(-6),
    { role: 'user' as const, content: `${question}\n\nRESPUESTA BASE (correcta, reescríbela con tus palabras y explícala):\n${draft}` },
  ];
  const stream = await llm.chat.completions.create({ messages, stream: true, temperature: 0.3, max_tokens: 400 });
  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content;
    if (text) yield text;
  }
}
