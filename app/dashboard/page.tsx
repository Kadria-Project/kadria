async function getProjects() {
  const res = await fetch('http://localhost:3000/api/projects', {
    cache: 'no-store',
  });

  return res.json();
}

export default async function DashboardPage() {
  const data = await getProjects();

  return (
    <main style={{ padding: 40 }}>
      <h1>Dashboard Kadria</h1>

      <p>
        Nombre de projets : {data.count}
      </p>

      <ul>
        {data.projects?.map((project: any) => (
          <li key={project.id}>
            <strong>{project['Client Name']}</strong>
            {' - '}
            {project.Trade}
            {' - '}
            {project.Status}
          </li>
        ))}
      </ul>
    </main>
  );
}