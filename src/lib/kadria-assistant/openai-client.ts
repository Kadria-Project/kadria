import 'server-only'
import OpenAI from 'openai'

// Client OpenAI minimal pour l'assistant interne Kadria. La clé n'est lue
// qu'au moment de l'appel (runtime), jamais au chargement du module, afin de
// ne jamais faire échouer le build Next.js si OPENAI_API_KEY est absente au
// moment du build (elle n'est nécessaire qu'à l'exécution de la route API).
export function getKadriaAssistantOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('MISSING_OPENAI_API_KEY')
  }
  return new OpenAI({ apiKey })
}

export const KADRIA_ASSISTANT_MODEL = 'gpt-4o-mini'
