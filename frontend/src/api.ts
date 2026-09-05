export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export type SystemStatus = { api: boolean; model: boolean; evaluation: boolean };

export async function getSystemStatus(): Promise<SystemStatus> {
  const [healthResponse, metricsResponse] = await Promise.all([
    fetch(`${API_BASE_URL}/health`),
    fetch(`${API_BASE_URL}/metrics`),
  ]);
  const health = healthResponse.ok ? (await healthResponse.json()) as { status?: string } : null;
  return {
    api: healthResponse.ok,
    model: health?.status === "ok",
    evaluation: metricsResponse.ok,
  };
}

export async function checkModelHealth(): Promise<boolean> {
  const response = await fetch(`${API_BASE_URL}/health`);
  if (!response.ok) return false;
  const health = (await response.json()) as { status?: string };
  return health.status === "ok";
}
