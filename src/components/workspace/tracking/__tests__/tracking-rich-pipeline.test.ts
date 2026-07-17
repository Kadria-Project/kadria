import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const workspaceRoot = process.cwd();

async function readTrackingComponent(fileName: string) {
  return readFile(path.join(workspaceRoot, 'src', 'components', 'workspace', 'tracking', fileName), 'utf8');
}

test('LivingPipeline preserves the rich opportunity content while retaining native horizontal scrolling', async () => {
  const source = await readTrackingComponent('LivingPipeline.tsx');

  for (const token of [
    'stageStyles',
    'PipelineOpportunityCard',
    'formatAmount(item.amount)',
    'TemperatureBadge',
    'MomentumBadge',
    'item.nextDecision',
    'items.length} opportunité',
    'overflow-x-auto',
    'scrollbar-width: none',
    '::-webkit-scrollbar { display: none',
    'Faites glisser pour voir la suite',
  ]) {
    assert.ok(source.includes(token), `expected rich pipeline token: ${token}`);
  }

  assert.ok(source.includes('aria-label="Faire défiler le pipeline vers la gauche"'));
  assert.ok(source.includes('aria-label="Faire défiler le pipeline vers la droite"'));
});

test('TrackingWorkspace keeps risks before detailed analysis with the intended desktop emphasis', async () => {
  const source = await readTrackingComponent('TrackingWorkspace.tsx');

  assert.ok(source.includes("useState(true)"));
  assert.ok(source.includes('aria-expanded={analysisOpen}'));
  assert.ok(source.includes('xl:grid-cols-[minmax(0,5fr)_minmax(0,3fr)]'));
  assert.ok(source.includes('Opportunités prioritaires'));
  assert.ok(source.includes('Synthèse commerciale'));

  const risksIndex = source.indexOf('Risques commerciaux');
  const analysisIndex = source.indexOf('Analyse détaillée');
  assert.ok(risksIndex >= 0 && analysisIndex > risksIndex, 'risks must remain before detailed analysis');
});
