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