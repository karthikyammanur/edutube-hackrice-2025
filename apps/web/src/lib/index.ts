export async function apiFetch(path: string, opts: RequestInit = {}) {
  const base = import.meta.env.VITE_API_BASE || 'http://localhost:3000';
  const res = await fetch(`${base}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function apiFetchRaw(path: string, opts: RequestInit = {}) {
  const base = import.meta.env.VITE_API_BASE || 'http://localhost:3000';
  const res = await fetch(`${base}${path}`, opts);
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res;
}
// Utility libraries will go here