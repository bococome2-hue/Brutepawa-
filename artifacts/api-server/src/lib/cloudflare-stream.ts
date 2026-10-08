const CF_ACCOUNT_ID = (process.env.CF_ACCOUNT_ID ?? process.env.R2_ACCOUNT_ID)!;
const CF_STREAM_TOKEN = process.env.CF_STREAM_TOKEN!;

const BASE = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream`;

export interface LiveInput {
  uid: string;
  webRTC: { url: string };
  webRTCPlayback: { url: string };
  dashPlayback: { url: string };
  created: string;
}

async function cfFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${CF_STREAM_TOKEN}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.json() as { success: boolean; result: T; errors: { message: string }[] };
  if (!body.success) {
    throw new Error(body.errors?.[0]?.message ?? "Cloudflare Stream API error");
  }
  return body.result;
}

export async function createLiveInput(meta: { userName: string }): Promise<LiveInput> {
  return cfFetch<LiveInput>("/live_inputs", {
    method: "POST",
    body: JSON.stringify({
      meta: { name: `brute-pawa-live-${meta.userName}-${Date.now()}` },
      recording: { mode: "off" },
    }),
  });
}

export async function deleteLiveInput(liveInputId: string): Promise<void> {
  const res = await fetch(`${BASE}/live_inputs/${liveInputId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${CF_STREAM_TOKEN}` },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Failed to delete live input: ${res.status}`);
  }
}

export async function getLiveInput(liveInputId: string): Promise<LiveInput> {
  return cfFetch<LiveInput>(`/live_inputs/${liveInputId}`);
}
