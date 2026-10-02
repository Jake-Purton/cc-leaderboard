export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = Array.isArray(data.detail) ? data.detail[0]?.msg : data.detail;
    throw new Error(detail || `Request failed (${res.status})`);
  }
  return data;
}

// Re-run `fn` every `ms` while the tab is visible, so everyone sees each other's changes.
export function poll(fn, ms = 5000) {
  const id = setInterval(() => {
    if (document.visibilityState === 'visible') fn();
  }, ms);
  return () => clearInterval(id);
}
