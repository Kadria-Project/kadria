import { z } from 'zod'

const text = (max: number) => z.string().trim().max(max).optional().default('')

export const projectIntakeSchema = z.object({
  existingClientId: z.string().uuid().nullable().optional(),
  clientFirstName: text(120),
  clientName: z.string().trim().min(1, 'Le nom du client est requis.').max(120),
  clientPhone: text(40),
  clientEmail: text(254),
  siteAddress: z.string().trim().min(1, "L'adresse du chantier est requise.").max(255),
  city: text(120),
  postalCode: text(20),
  latitude: z.number().finite().nullable().optional(),
  longitude: z.number().finite().nullable().optional(),
  projectType: text(160),
  description: text(4000),
  trade: text(160),
  tradeAnswers: z.array(z.object({ question: z.string().trim().max(500), answer: z.string().trim().max(1000) })).max(12).default([]),
  budget: text(100),
  desiredTimeline: text(160),
  urgency: text(80),
  source: text(80).transform((value) => value || 'quick-create'),
}).superRefine((value, context) => {
  if (!value.clientPhone && !value.clientEmail) context.addIssue({ code: 'custom', path: ['clientPhone'], message: 'Un téléphone ou un e-mail est requis.' })
})

export type ProjectIntakeContract = z.infer<typeof projectIntakeSchema>

export function projectIntakeToProjectInput(input: ProjectIntakeContract, artisanId: string) {
  return {
    artisanId,
    clientName: input.clientName,
    clientFirstName: input.clientFirstName,
    clientPhone: input.clientPhone,
    clientEmail: input.clientEmail,
    siteAddress: input.siteAddress,
    city: input.city,
    postalCode: input.postalCode,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    trade: input.trade || 'Autre',
    projectType: input.projectType,
    budget: input.budget,
    desiredTimeline: input.desiredTimeline,
    tradeAnswers: input.tradeAnswers,
    aiSummary: input.description,
    source: input.source,
  }
}
