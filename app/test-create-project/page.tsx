'use client';

export default function TestCreateProjectPage() {
  async function createProject() {
    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientName: 'Test',
        clientFirstName: 'Antonin',
        clientPhone: '0600000000',
        clientEmail: 'test@kadria.local',
        siteAddress: '1 Rue de Test 76000 Rouen',
        city: 'Rouen',
        postalCode: '76000',
        trade: 'Test migration',
        projectType: 'Rénovation',
        budget: '1 000 à 3 000 €',
        desiredTimeline: 'Sous 1 mois',
        maturity: 'Prêt à démarrer',
        aiSummary: 'Projet de test créé depuis la nouvelle API Next.js.',
        chatHistory: '{"test":true}',
        tradeAnswers: [
          { question: 'Test question', answer: 'Test réponse' },
        ],
        completenessScore: 100,
        source: 'migration-test',
        artisanId: 'Artisan_demo',
      }),
    });

    const data = await response.json();
    alert(JSON.stringify(data, null, 2));
  }

  return (
    <main style={{ padding: 40 }}>
      <h1>Test création projet</h1>
      <button onClick={createProject}>
        Créer un projet test dans Airtable
      </button>
    </main>
  );
}