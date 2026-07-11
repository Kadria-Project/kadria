type GetProjectsParams = {
  status?: string;
  trade?: string;
  search?: string;
};

export async function getProjects(params: GetProjectsParams = {}) {
  const searchParams = new URLSearchParams();

  if (params.status) searchParams.set('status', params.status);
  if (params.trade) searchParams.set('trade', params.trade);
  if (params.search) searchParams.set('search', params.search);

  const query = searchParams.toString();
  const url = query ? `/api/projects?${query}` : '/api/projects';

  const res = await fetch(url);

  if (!res.ok) throw new Error('Erreur récupération projets');

  return res.json();
}

export async function getStats() {
  const res = await fetch('/api/stats');

  if (!res.ok) throw new Error('Erreur récupération stats');

  return res.json();
}

export async function getProject(id: string) {
  const res = await fetch(`/api/projects/${id}`);

  if (!res.ok) throw new Error('Erreur récupération dossier');

  return res.json();
}

export async function updateProject(id: string, data: Record<string, unknown>) {
  const res = await fetch(`/api/projects/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error('Erreur mise à jour dossier');

  return res.json();
}

export async function updateProjectResponsible(id: string, responsibleUserId: string | null) {
  const res = await fetch(`/api/projects/${id}/responsible`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ responsibleUserId }),
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Erreur mise à jour responsable dossier');
  }

  return data;
}

export async function getProjectActivity(id: string) {
  const res = await fetch(`/api/projects/${id}/activity`);

  if (!res.ok) throw new Error('Erreur récupération historique');

  return res.json();
}

export async function createProjectDepositCheckout(id: string) {
  const res = await fetch(`/api/projects/${id}/deposit-checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await res.json();

  if (!res.ok || !data.success) throw new Error(data.error || "Erreur génération lien d'acompte");

  return data;
}

export async function sendProjectCompletionSms(id: string) {
  const res = await fetch(`/api/projects/${id}/send-completion-sms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.error || "Erreur envoi SMS de complément");
  }

  return data;
}
