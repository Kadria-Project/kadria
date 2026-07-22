import type { InterventionArbitrationType } from './intervention-arbitration'

// C7 uses only tenant-scoped quote follow-up facts already persisted in Activity.
export const UTILITY_WINDOW_DAYS = 180
export const UTILITY_LIMITS = { limited: 3, usable: 6, executionRate: 0.6, resolutionRate: 0.5, disputeRate: 0.4, lowDisputeRate: 0.2 } as const
export type UtilityConfidence = 'insufficient' | 'limited' | 'usable'
export type UtilityAssessment = 'insufficient_evidence' | 'usually_helpful' | 'mixed' | 'often_disputed' | 'low_observed_effect'
export type UtilityEvent = { interventionId: string; type: 'viewed' | 'executed' | 'resolved' | 'obsolete'; createdAt: string; arbitrationType?: InterventionArbitrationType }
export type InterventionUtility = { sampleSize:number; viewedCount:number; executedCount:number; resolvedCount:number; disputedCount:number; declinedCount:number; snoozedCount:number; noEffectCount:number; executionRate:number; resolutionRate:number; disputeRate:number; confidenceLevel:UtilityConfidence; utilityAssessment:UtilityAssessment; priorityAdjustment:-1|0|1; explanationFacts:string[] }
const rate=(part:number,total:number)=>total?part/total:0
export function evaluateInterventionUtility(events: UtilityEvent[], now=new Date()): InterventionUtility {
  const threshold=now.getTime()-UTILITY_WINDOW_DAYS*86400000
  const current=events.filter((event)=>new Date(event.createdAt).getTime()>=threshold)
  const sampleSize=new Set(current.map((event)=>event.interventionId)).size
  const count=(predicate:(event:UtilityEvent)=>boolean)=>current.filter(predicate).length
  const viewedCount=count(e=>e.type==='viewed'), executedCount=count(e=>e.type==='executed'), resolvedCount=count(e=>e.type==='resolved')
  const disputedCount=count(e=>e.arbitrationType==='not_relevant'||e.arbitrationType==='priority_disputed'), declinedCount=count(e=>e.arbitrationType==='declined'), snoozedCount=count(e=>e.arbitrationType==='snoozed')
  const noEffectCount=Math.max(0,executedCount-resolvedCount), executionRate=rate(executedCount,sampleSize), resolutionRate=rate(resolvedCount,sampleSize), disputeRate=rate(disputedCount,sampleSize)
  const confidenceLevel:UtilityConfidence=sampleSize>=UTILITY_LIMITS.usable?'usable':sampleSize>=UTILITY_LIMITS.limited?'limited':'insufficient'
  let utilityAssessment:UtilityAssessment='insufficient_evidence', priorityAdjustment:-1|0|1=0, explanationFacts=['Historique comparable insuffisant pour ajuster cette priorité.']
  if(confidenceLevel==='usable'&&executionRate>=UTILITY_LIMITS.executionRate&&disputeRate>=UTILITY_LIMITS.disputeRate){utilityAssessment='mixed';explanationFacts=['Les résultats comparables sont trop contrastés pour ajuster cette priorité.']}
  else if(confidenceLevel==='usable'&&executionRate>=UTILITY_LIMITS.executionRate&&resolutionRate>=UTILITY_LIMITS.resolutionRate&&disputeRate<=UTILITY_LIMITS.lowDisputeRate){utilityAssessment='usually_helpful';priorityAdjustment=1;explanationFacts=['Les relances comparables conduisent souvent à une décision après action.']}
  else if(confidenceLevel==='usable'&&disputeRate>=UTILITY_LIMITS.disputeRate){utilityAssessment='often_disputed';priorityAdjustment=-1;explanationFacts=['Cette recommandation est régulièrement contestée avec des preuves comparables.']}
  else if(confidenceLevel==='usable'&&executedCount>=UTILITY_LIMITS.limited&&resolutionRate<=UTILITY_LIMITS.lowDisputeRate){utilityAssessment='low_observed_effect';priorityAdjustment=-1;explanationFacts=['Des actions comparables ont été observées sans résultat métier suffisant.']}
  else if(confidenceLevel!=='insufficient'){utilityAssessment='mixed';explanationFacts=['Les résultats comparables sont trop contrastés pour ajuster cette priorité.']}
  return {sampleSize,viewedCount,executedCount,resolvedCount,disputedCount,declinedCount,snoozedCount,noEffectCount,executionRate,resolutionRate,disputeRate,confidenceLevel,utilityAssessment,priorityAdjustment,explanationFacts}
}
