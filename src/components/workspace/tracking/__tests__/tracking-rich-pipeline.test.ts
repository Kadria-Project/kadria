import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const workspaceRoot = process.cwd();

async function readTrackingComponent(fileName: string) {
  return readFile(path.join(workspaceRoot, 'src', 'components', 'workspace', 'tracking', fileName), 'utf8');
}

test('LivingPipeline remains an exploration tool with native horizontal scrolling', async () => {
  const source = await readTrackingComponent('LivingPipeline.tsx');

  for (const token of [
    'stageStyles',
    'PipelineOpportunityCard',
    'formatAmount(item.amount)',
    'Étape actuelle',
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

test('TrackingWorkspace keeps commercial decisions ahead of portfolio exploration', async () => {
  const source = await readTrackingComponent('TrackingWorkspace.tsx');

  assert.ok(source.includes('deriveCommercialSituations'));
  assert.ok(source.includes('Décisions à prendre'));
  assert.ok(source.includes('Explorer le portefeuille commercial'));
  assert.ok(source.includes('deriveCommercialCalmState'));

  const decisionsIndex = source.indexOf('Décisions à prendre');
  const portfolioIndex = source.indexOf('Explorer le portefeuille commercial');
  assert.ok(decisionsIndex >= 0 && portfolioIndex > decisionsIndex, 'decisions must remain before portfolio exploration');
});
