import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { ChatMessage, DossierComplet } from '@/src/types/dossier';

const SYSTEM_PROMPT = `Tu es Kadria, un assistant IA intégré sur le site d'un artisan du bâtiment.
Ton rôle : qualifier les prospects en conversation naturelle pour créer un dossier complet.
Collecte dans l'ordre : prénom/nom, téléphone, email, adresse chantier, type de travaux,
description projet, budget (fourchettes : <1k / 1-3k / 3-10k / 10-30k / >30k€),
délai souhaité, maturité du projet.
Pose UNE seule question à la fois. Sois chaleureux et concis (2-3 phrases max).
Quand score >= 80, propose de soumettre le dossier.

Réponds UNIQUEMENT avec ce JSON :
{
  reply: string,
  dossierUpdate: { clientName?, clientFirstName?, clientPhone?, clientEmail?,
    siteAddress?, city?, postalCode?, trade?, projectType?, budget?,
    desiredTimeline?, maturity?, tradeAnswers?: [] },
  completenessScore: number (0-100),
  readyToSave: boolean,
  aiSummary: string
}`;

interface ChatRequestBody {
  messages: ChatMessage[];
  currentDossier: Partial<DossierComplet>;
  artisanId: string;
}

interface ChatResponseData {
  reply: string;
  dossierUpdate: Partial<DossierComplet>;
  completenessScore: number;
  readyToSave: boolean;
  aiSummary: string;
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: Request) {
  try {
    const body: ChatRequestBody = await request.json();
    const { messages, currentDossier, artisanId } = body;

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: `${SYSTEM_PROMPT}\n\nDossier actuel : ${JSON.stringify(currentDossier ?? {})}\nArtisan ID : ${artisanId ?? ''}`,
      messages: messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    });

    const textBlock = response.content.find((block) => block.type === 'text');

    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('Réponse IA invalide : aucun contenu texte');
    }

    const cleaned = textBlock.text
      .trim()
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/, '')
      .trim();

    const parsed: ChatResponseData = JSON.parse(cleaned);

    return NextResponse.json({
      success: true,
      reply: parsed.reply,
      dossierUpdate: parsed.dossierUpdate ?? {},
      completenessScore: parsed.completenessScore ?? 0,
      readyToSave: parsed.readyToSave ?? false,
      aiSummary: parsed.aiSummary ?? '',
    });
  } catch (error) {
    console.error('CHAT_ERROR', error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : JSON.stringify(error, null, 2),
      },
      { status: 500 },
    );
  }
}
