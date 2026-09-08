import type { MasteringParams, ProjectResponse } from "@/types/mastering";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.detail === "string") return data.detail;
    return JSON.stringify(data?.detail ?? data);
  } catch {
    return res.statusText || "Request failed";
  }
}

export async function createProject(file: File): Promise<ProjectResponse> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/api/projects`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function reprocessProject(
  projectId: string,
  params: MasteringParams
): Promise<ProjectResponse> {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/process`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ params }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export function mediaUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${API_BASE}${path}`;
}
