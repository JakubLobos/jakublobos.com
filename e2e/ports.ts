// Overridable because something else on the host (e.g. a WSL port relay) can own the defaults.
export const SITE_PORT = process.env.E2E_SITE_PORT ?? '8787';
export const API_PORT = process.env.E2E_API_PORT ?? '3000';
export const SITE = `http://localhost:${SITE_PORT}`;
export const API = `http://localhost:${API_PORT}`;
