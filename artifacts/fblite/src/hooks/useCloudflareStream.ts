import { useRef, useState, useCallback } from "react";
import { getBpToken } from "../lib/api";

export type StreamStatus =
  | "idle"
  | "creating"
  | "connecting"
  | "live"
  | "ending"
  | "ended"
  | "error";

export interface StreamSession {
  id: number | null;
  liveInputId: string;
  webRtcUrl: string;
  playbackUrl: string;
}

interface UseCloudflareStreamOptions {
  onStatusChange?: (status: StreamStatus) => void;
}

export function useCloudflareStream(opts?: UseCloudflareStreamOptions) {
  const [status, setStatus] = useState<StreamStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<StreamSession | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const updateStatus = useCallback((s: StreamStatus) => {
    setStatus(s);
    opts?.onStatusChange?.(s);
  }, [opts]);

  const startStream = useCallback(async (
    localStream: MediaStream,
    user: { userId: string; userName: string; userFlag?: string }
  ) => {
    if (status !== "idle" && status !== "error") return;
    setError(null);
    localStreamRef.current = localStream;

    try {
      updateStatus("creating");

      const token = getBpToken();
      const res = await fetch("/api/stream/live", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          userId:   user.userId,
          userName: user.userName,
          userFlag: user.userFlag ?? "",
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      const raw = await res.json() as { id?: number | null; liveInputId: string; webRtcUrl: string; playbackUrl: string };
      const sess: StreamSession = {
        id: raw.id ?? null,
        liveInputId: raw.liveInputId,
        webRtcUrl: raw.webRtcUrl,
        playbackUrl: raw.playbackUrl,
      };
      setSession(sess);
      updateStatus("connecting");

      await connectWebRTC(localStream, sess.webRtcUrl);
      updateStatus("live");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      updateStatus("error");
    }
  }, [status, updateStatus]);

  async function connectWebRTC(localStream: MediaStream, whipUrl: string) {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }],
      bundlePolicy: "max-bundle",
    });
    pcRef.current = pc;

    for (const track of localStream.getTracks()) {
      pc.addTrack(track, localStream);
    }

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("ICE gathering timeout")), 10000);
      if (pc.iceGatheringState === "complete") {
        clearTimeout(timeout);
        resolve();
        return;
      }
      pc.onicegatheringstatechange = () => {
        if (pc.iceGatheringState === "complete") {
          clearTimeout(timeout);
          resolve();
        }
      };
    });

    const sdp = pc.localDescription!.sdp;

    const whipRes = await fetch(whipUrl, {
      method: "POST",
      headers: { "Content-Type": "application/sdp" },
      body: sdp,
    });

    if (!whipRes.ok) {
      throw new Error(`WHIP handshake failed: ${whipRes.status}`);
    }

    const answerSdp = await whipRes.text();
    await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
  }

  const stopStream = useCallback(async () => {
    if (!session) return;
    updateStatus("ending");

    try {
      pcRef.current?.close();
      pcRef.current = null;

      const token = getBpToken();
      await fetch(`/api/stream/live/${session.liveInputId}`, {
        method: "DELETE",
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
      });
    } catch {
      // best-effort cleanup
    }

    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    setSession(null);
    updateStatus("ended");
  }, [session, updateStatus]);

  const stopLocalTracks = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current = null;
  }, []);

  return { status, error, session, startStream, stopStream, stopLocalTracks };
}
