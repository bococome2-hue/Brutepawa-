import { useState, useEffect, useRef, useCallback } from "react";
import { getBpToken } from "../lib/api";

const BASE = "/api";

// ─── ICE servers ─────────────────────────────────────────────────────────────
// STUN (free) + public TURN relay as fallback for symmetric NAT (MTN/Orange/Moov).
// Replace open-relay credentials with Cloudflare Calls TURN when CF_TURN_KEY_ID
// is configured via the /api/turn-credentials endpoint.
const DEFAULT_ICE: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
  {
    urls: [
      "turn:openrelay.metered.ca:80",
      "turn:openrelay.metered.ca:443",
      "turn:openrelay.metered.ca:443?transport=tcp",
    ],
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

async function fetchIceServers(): Promise<RTCIceServer[]> {
  try {
    const token = getBpToken();
    const res = await fetch(`${BASE}/turn-credentials`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const data = await res.json() as { iceServers?: RTCIceServer[] };
      if (data.iceServers?.length) return data.iceServers;
    }
  } catch { /* fall through */ }
  return DEFAULT_ICE;
}

// ─── Ringtone (plays through loudspeaker on mobile) ──────────────────────────
let _ringtoneCtx: AudioContext | null = null;
let _ringtoneNode: OscillatorNode | null = null;
let _ringtoneGain: GainNode | null = null;
let _ringtoneTimer: ReturnType<typeof setTimeout> | null = null;
let _ringtonePlaying = false;

function playRingtone() {
  if (_ringtonePlaying) return;
  _ringtonePlaying = true;
  try {
    const ctx = new AudioContext();
    _ringtoneCtx = ctx;
    const gain = ctx.createGain();
    gain.gain.value = 0.6;
    gain.connect(ctx.destination);
    _ringtoneGain = gain;

    function beep() {
      if (!_ringtonePlaying) return;
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = 480;
      osc.connect(gain);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
      _ringtoneNode = osc;
      _ringtoneTimer = setTimeout(() => { if (_ringtonePlaying) beep(); }, 1800);
    }
    beep();
  } catch { /* ignore if AudioContext unavailable */ }
}

function stopRingtone() {
  _ringtonePlaying = false;
  if (_ringtoneTimer) { clearTimeout(_ringtoneTimer); _ringtoneTimer = null; }
  try { _ringtoneNode?.stop(); } catch { /* ignore */ }
  try { _ringtoneCtx?.close(); } catch { /* ignore */ }
  _ringtoneCtx = null;
  _ringtoneNode = null;
  _ringtoneGain = null;
}

// ─── Media constraints ───────────────────────────────────────────────────────
// Audio notes for Android Chrome:
//   • Do NOT force sampleRate — hardware AEC on Android typically runs at 16kHz.
//     Forcing 48kHz causes software resampling which desynchronises the AEC
//     reference signal → residual echo.
//   • googEchoCancellation / googNoiseSuppression2 / googHighpassFilter are
//     Chrome-specific constraints that activate hardware AEC on Android.
//   • channelCount: 1 (mono) is required for hardware AEC on most Android SoCs.
//   • latency: 0 tells Chrome to use the lowest-latency audio path, which on
//     Android routes through AudioManager.MODE_IN_COMMUNICATION (earpiece AEC).
async function getMedia(type: "audio" | "video"): Promise<MediaStream> {
  const audioConstraints: MediaTrackConstraints & Record<string, unknown> = {
    echoCancellation:    true,
    noiseSuppression:    true,
    autoGainControl:     true,
    channelCount:        1,
    // Let the OS/hardware decide sample rate (do NOT pin to 48000)
    // Chrome/Android AEC extras — ignored gracefully on other browsers
    googEchoCancellation:    true,
    googNoiseSuppression:    true,
    googAutoGainControl:     true,
    googHighpassFilter:      true,
    googNoiseSuppression2:   true,
    googEchoCancellationType: "browser",
    latency:             0,
  };

  return navigator.mediaDevices.getUserMedia({
    audio: audioConstraints,
    video: type === "video"
      ? {
          facingMode: "user",
          width:     { ideal: 640, max: 1280 },
          height:    { ideal: 480, max: 720 },
          frameRate: { ideal: 24, max: 30 },
        }
      : false,
  });
}

export type CallState = "idle" | "calling" | "incoming" | "active";

export interface IncomingCallInfo {
  fromUserId: number;
  callType: "audio" | "video";
}

export interface NewMessagePayload {
  id: number;
  fromUserId: number;
  toUserId: number;
  content: string;
  createdAt: string;
  messageType?: "text" | "poll" | "image" | "audio" | "contact" | "location";
  pollId?: number;
}

export interface MessageStatusPayload {
  messageIds: number[];
}

async function postSignal(to: number, type: string, payload: unknown = {}) {
  const token = getBpToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7_000);
  try {
    await fetch(`${BASE}/signaling/send`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ to, type, payload }),
    });
  } catch { /* network error */ }
  finally { clearTimeout(timeout); }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useCallSignaling(
  meId: number,
  onNewMessage?: (msg: NewMessagePayload) => void,
  onMessageDelivered?: (messageIds: number[]) => void,
  onMessageRead?: (messageIds: number[]) => void,
  onReconnect?: () => void,
) {
  const [callState, setCallState]       = useState<CallState>("idle");
  const [callType, setCallType]         = useState<"audio" | "video" | null>(null);
  const [callPeerId, setCallPeerId]     = useState<number | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCallInfo | null>(null);
  const [localStream, setLocalStream]   = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted]             = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  // Start in earpiece mode (false). Speaker-on is the #1 cause of echo/whistle
  // on Android because the loudspeaker saturates the mic before AEC can cancel it.
  const [isSpeaker, setIsSpeaker]         = useState(false);
  const [cameraFront, setCameraFront]     = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [mediaError, setMediaError]     = useState<string | null>(null);

  const pcRef             = useRef<RTCPeerConnection | null>(null);
  const localStreamRef    = useRef<MediaStream | null>(null);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
  const callTimerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const iceRecoveryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iceRecoveryDeadlineRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iceRecoveryInFlightRef = useRef(false);
  const activeIceRestartIdRef = useRef<string | null>(null);
  const remoteIceRestartIdRef = useRef<string | null>(null);
  const negotiationSequenceRef = useRef(0);
  const makingOfferRef = useRef(false);
  const activeRenegotiationIdRef = useRef<string | null>(null);
  const renegotiationDeadlineRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastInboundAudioPacketsRef = useRef<number | null>(null);
  const stalledAudioChecksRef = useRef(0);
  const callStateRef      = useRef<CallState>("idle");
  const callPeerIdRef     = useRef<number | null>(null);
  const handleSignalRef   = useRef<((msg: SignalMsg) => Promise<void>) | null>(null);
  const isMutedRef        = useRef(false);
  const onNewMessageRef        = useRef(onNewMessage);
  const onMessageDeliveredRef  = useRef(onMessageDelivered);
  const onMessageReadRef       = useRef(onMessageRead);
  const iceServersRef          = useRef<RTCIceServer[]>(DEFAULT_ICE);

  useEffect(() => { onNewMessageRef.current = onNewMessage; }, [onNewMessage]);
  useEffect(() => { onMessageDeliveredRef.current = onMessageDelivered; }, [onMessageDelivered]);
  useEffect(() => { onMessageReadRef.current = onMessageRead; }, [onMessageRead]);

  // Prefetch ICE servers (may include Cloudflare TURN)
  useEffect(() => {
    fetchIceServers().then((servers) => { iceServersRef.current = servers; });
  }, []);

  interface SignalMsg {
    type: string;
    from: number;
    payload: Record<string, unknown>;
  }

  const _setCallState  = (s: CallState)     => { callStateRef.current = s; setCallState(s); };
  const _setCallPeerId = (id: number | null) => { callPeerIdRef.current = id; setCallPeerId(id); };

  const stopTimer = useCallback(() => {
    if (callTimerRef.current) { clearInterval(callTimerRef.current); callTimerRef.current = null; }
    setCallDuration(0);
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    callTimerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
  }, [stopTimer]);

  const stopLocal = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
  }, []);

  const cleanup = useCallback(() => {
    stopRingtone();
    stopTimer();
    stopLocal();
    if (iceRecoveryTimerRef.current) {
      clearTimeout(iceRecoveryTimerRef.current);
      iceRecoveryTimerRef.current = null;
    }
    if (iceRecoveryDeadlineRef.current) {
      clearTimeout(iceRecoveryDeadlineRef.current);
      iceRecoveryDeadlineRef.current = null;
    }
    if (renegotiationDeadlineRef.current) {
      clearTimeout(renegotiationDeadlineRef.current);
      renegotiationDeadlineRef.current = null;
    }
    iceRecoveryInFlightRef.current = false;
    activeIceRestartIdRef.current = null;
    remoteIceRestartIdRef.current = null;
    activeRenegotiationIdRef.current = null;
    makingOfferRef.current = false;
    lastInboundAudioPacketsRef.current = null;
    stalledAudioChecksRef.current = 0;
    pcRef.current?.close();
    pcRef.current = null;
    pendingCandidates.current = [];
    setRemoteStream(null);
    _setCallState("idle");
    _setCallPeerId(null);
    setCallType(null);
    setIncomingCall(null);
    isMutedRef.current = false;
    setIsMuted(false);
    setIsVideoEnabled(true);
    setIsScreenSharing(false);
    setIsSpeaker(false); // Reset to earpiece, not speaker
    setCameraFront(true);
    setMediaError(null);
  }, [stopTimer, stopLocal]);

  // ─── Limit video bitrate after connection ──────────────────────────────────
  function applyBitrateLimit(pc: RTCPeerConnection) {
    pc.getSenders().forEach(async (sender) => {
      if (sender.track?.kind !== "video") return;
      const params = sender.getParameters();
      if (!params.encodings?.length) params.encodings = [{}];
      params.encodings[0].maxBitrate = 600_000; // 600 kbps max for video
      params.encodings[0].scaleResolutionDownBy = 1;
      try { await sender.setParameters(params); } catch { /* ignore */ }
    });
    pc.getSenders().forEach(async (sender) => {
      if (sender.track?.kind !== "audio") return;
      const params = sender.getParameters();
      if (!params.encodings?.length) params.encodings = [{}];
      params.encodings[0].maxBitrate = 64_000; // 64 kbps for audio (Opus)
      try { await sender.setParameters(params); } catch { /* ignore */ }
    });
  }

  const recoverIce = useCallback(async () => {
    const pc = pcRef.current;
    const peerId = callPeerIdRef.current;
    if (
      !pc ||
      peerId === null ||
      callStateRef.current !== "active" ||
      iceRecoveryInFlightRef.current ||
      makingOfferRef.current ||
      activeRenegotiationIdRef.current
    ) return;

    iceRecoveryInFlightRef.current = true;
    try {
      // Only one side creates the restart offer. The other asks that side to do it,
      // preventing simultaneous offers ("glare") on unstable mobile networks.
      if (meId < peerId) {
        if (pc.signalingState !== "stable") {
          iceRecoveryInFlightRef.current = false;
          return;
        }
        makingOfferRef.current = true;
        const restartId = `${meId}-${++negotiationSequenceRef.current}-${Date.now()}`;
        activeIceRestartIdRef.current = restartId;
        try {
          const offer = await pc.createOffer({ iceRestart: true });
          await pc.setLocalDescription(offer);

          // Arm rollback before network I/O: fetch can remain pending on a
          // blackholed mobile connection.
          if (iceRecoveryDeadlineRef.current) clearTimeout(iceRecoveryDeadlineRef.current);
          iceRecoveryDeadlineRef.current = setTimeout(async () => {
            if (pcRef.current !== pc || activeIceRestartIdRef.current !== restartId) return;
            try {
              if (pc.signalingState === "have-local-offer") {
                await pc.setLocalDescription({ type: "rollback" });
              }
            } catch { /* connection may already be closing */ }
            iceRecoveryInFlightRef.current = false;
            activeIceRestartIdRef.current = null;
          }, 10_000);

          await postSignal(peerId, "call:ice-restart-offer", { sdp: pc.localDescription, restartId });
        } catch {
          if (iceRecoveryDeadlineRef.current) {
            clearTimeout(iceRecoveryDeadlineRef.current);
            iceRecoveryDeadlineRef.current = null;
          }
          try {
            if (pc.signalingState === "have-local-offer") {
              await pc.setLocalDescription({ type: "rollback" });
            }
          } catch { /* connection may already be closing */ }
          activeIceRestartIdRef.current = null;
          iceRecoveryInFlightRef.current = false;
        } finally {
          makingOfferRef.current = false;
        }
      } else {
        await postSignal(peerId, "call:ice-restart-request", {});
        iceRecoveryInFlightRef.current = false;
      }
    } catch {
      iceRecoveryInFlightRef.current = false;
    }
  }, [meId]);

  const buildPC = useCallback((stream: MediaStream): RTCPeerConnection => {
    pcRef.current?.close();
    const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });
    pcRef.current = pc;

    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    const remote = new MediaStream();
    pc.ontrack = e => {
      const newTrack = e.track;
      // Replace any existing track of the same kind (camera→screen or screen→camera)
      const oldTrack = remote.getTracks().find(t => t.kind === newTrack.kind && t.id !== newTrack.id);
      if (oldTrack) remote.removeTrack(oldTrack);
      if (!remote.getTracks().find(t => t.id === newTrack.id)) remote.addTrack(newTrack);
      if (oldTrack) {
        // Track was replaced: force a new MediaStream reference so React's useEffect
        // re-runs and re-assigns <video>.srcObject — ensuring the element binds to
        // the screen track (or restored camera) instead of keeping the stale one.
        setRemoteStream(new MediaStream(remote.getTracks()));
      } else {
        // First-time track (audio or video on call start): mutate in-place to avoid flicker
        setRemoteStream(prev => (prev === remote ? remote : remote));
      }
    };

    // Suppress Chrome's automatic re-negotiation on removeTrack/addTrack.
    // We manage offer/answer exchange explicitly via renegotiate() to avoid
    // concurrent offer collisions that cause silent failures.
    pc.onnegotiationneeded = () => {};

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        if (iceRecoveryTimerRef.current) {
          clearTimeout(iceRecoveryTimerRef.current);
          iceRecoveryTimerRef.current = null;
        }
        if (pc.signalingState === "stable" && !activeIceRestartIdRef.current && iceRecoveryDeadlineRef.current) {
          clearTimeout(iceRecoveryDeadlineRef.current);
          iceRecoveryDeadlineRef.current = null;
        }
        if (!activeIceRestartIdRef.current) iceRecoveryInFlightRef.current = false;
        stalledAudioChecksRef.current = 0;
        applyBitrateLimit(pc);
        return;
      }

      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        if (iceRecoveryTimerRef.current) clearTimeout(iceRecoveryTimerRef.current);
        const delay = pc.connectionState === "failed" ? 0 : 3_000;
        iceRecoveryTimerRef.current = setTimeout(() => {
          if (pcRef.current === pc && callStateRef.current === "active") void recoverIce();
        }, delay);
      }
    };

    return pc;
  }, [recoverIce]);

  const drainCandidates = useCallback(async (pc: RTCPeerConnection) => {
    const pending = pendingCandidates.current.splice(0);
    for (const c of pending) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch { /* ignore */ }
    }
  }, []);

  const handleSignal = useCallback(async (msg: SignalMsg) => {
    const { type, from, payload } = msg;

    if (type === "call:invite") {
      if (callStateRef.current !== "idle") {
        await postSignal(from, "call:reject", { reason: "busy" });
        return;
      }
      const ct = (payload.callType as "audio" | "video") ?? "audio";
      setIncomingCall({ fromUserId: from, callType: ct });
      _setCallPeerId(from);
      setCallType(ct);
      _setCallState("incoming");
      playRingtone();
      return;
    }

    if (type === "call:accept") {
      stopRingtone();
      const stream = localStreamRef.current;
      if (!stream) return;

      const pc = buildPC(stream);
      pc.onicecandidate = ({ candidate }) => {
        if (candidate && callPeerIdRef.current !== null)
          postSignal(callPeerIdRef.current, "call:ice", { candidate: candidate.toJSON() });
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await postSignal(from, "call:offer", { sdp: pc.localDescription });
      return;
    }

    if (type === "call:offer") {
      stopRingtone();
      const stream = localStreamRef.current;
      const pc     = pcRef.current;
      if (!stream || !pc) return;

      pc.onicecandidate = ({ candidate }) => {
        if (candidate && callPeerIdRef.current !== null)
          postSignal(callPeerIdRef.current, "call:ice", { candidate: candidate.toJSON() });
      };

      await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp as RTCSessionDescriptionInit));
      await drainCandidates(pc);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await postSignal(from, "call:answer", { sdp: pc.localDescription });
      _setCallState("active");
      startTimer();
      return;
    }

    if (type === "call:answer") {
      stopRingtone();
      const pc = pcRef.current;
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp as RTCSessionDescriptionInit));
      await drainCandidates(pc);
      _setCallState("active");
      startTimer();
      return;
    }

    if (type === "call:ice") {
      const pc        = pcRef.current;
      const candidate = payload.candidate as RTCIceCandidateInit;
      if (pc && pc.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch {
          // A restart candidate can arrive before its new SDP because candidate
          // gathering begins as soon as setLocalDescription resolves.
          pendingCandidates.current.push(candidate);
        }
      } else {
        pendingCandidates.current.push(candidate);
      }
      return;
    }

    if (type === "call:ice-restart-request") {
      // The lower user id is the deterministic restart-offer owner.
      if (meId < from) void recoverIce();
      return;
    }

    if (type === "call:ice-restart-offer") {
      const pc = pcRef.current;
      if (!pc) return;
      const restartId = String(payload.restartId ?? "");
      if (!restartId) return;
      try {
        if (makingOfferRef.current || pc.signalingState !== "stable") {
          // The receiver is the polite peer for deterministic restart offers.
          if (pc.signalingState === "have-local-offer") {
            await pc.setLocalDescription({ type: "rollback" });
          } else if (pc.signalingState !== "stable") {
            return;
          }
        }
        remoteIceRestartIdRef.current = restartId;
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp as RTCSessionDescriptionInit));
        await drainCandidates(pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await postSignal(from, "call:ice-restart-answer", { sdp: pc.localDescription, restartId });
        iceRecoveryInFlightRef.current = false;
      } catch {
        remoteIceRestartIdRef.current = null;
        iceRecoveryInFlightRef.current = false;
      }
      return;
    }

    if (type === "call:ice-restart-answer") {
      const pc = pcRef.current;
      if (!pc) return;
      const restartId = String(payload.restartId ?? "");
      if (!restartId || restartId !== activeIceRestartIdRef.current) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp as RTCSessionDescriptionInit));
        await postSignal(from, "call:ice-restart-complete", { restartId });
      } finally {
        if (iceRecoveryDeadlineRef.current) {
          clearTimeout(iceRecoveryDeadlineRef.current);
          iceRecoveryDeadlineRef.current = null;
        }
        activeIceRestartIdRef.current = null;
        iceRecoveryInFlightRef.current = false;
      }
      return;
    }

    if (type === "call:ice-restart-complete") {
      const restartId = String(payload.restartId ?? "");
      if (restartId && restartId === remoteIceRestartIdRef.current) {
        remoteIceRestartIdRef.current = null;
      }
      return;
    }

    if (type === "call:reject" || type === "call:end") {
      cleanup();
      return;
    }

    // ─── Remote video force-refresh (after replaceTrack on screen share) ────────
    if (type === "call:screen-refresh") {
      // Create a new MediaStream wrapper from same tracks → forces srcObject reassignment
      setRemoteStream(prev => {
        if (!prev) return prev;
        return new MediaStream(prev.getTracks());
      });
      return;
    }

    // ─── Mid-call renegotiation (triggered when adding a new track) ────────────
    if (type === "call:renego") {
      const pc = pcRef.current;
      if (!pc) return;
      const negotiationId = String(payload.negotiationId ?? "");
      if (!negotiationId || activeIceRestartIdRef.current || remoteIceRestartIdRef.current) return;
      try {
        const offerCollision = makingOfferRef.current || pc.signalingState !== "stable";
        const polite = meId > from;
        if (offerCollision && !polite) return;
        if (offerCollision && pc.signalingState === "have-local-offer") {
          await pc.setLocalDescription({ type: "rollback" });
        } else if (pc.signalingState !== "stable") {
          return;
        }
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp as RTCSessionDescriptionInit));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await postSignal(from, "call:renego-answer", { sdp: pc.localDescription, negotiationId });
      } catch { /* ignore */ }
      return;
    }

    if (type === "call:renego-answer") {
      const pc = pcRef.current;
      if (!pc) return;
      const negotiationId = String(payload.negotiationId ?? "");
      if (!negotiationId || negotiationId !== activeRenegotiationIdRef.current) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp as RTCSessionDescriptionInit));
      } catch { /* ignore */ }
      finally {
        if (renegotiationDeadlineRef.current) {
          clearTimeout(renegotiationDeadlineRef.current);
          renegotiationDeadlineRef.current = null;
        }
        activeRenegotiationIdRef.current = null;
      }
      return;
    }
  }, [buildPC, drainCandidates, startTimer, cleanup, meId, recoverIce]);

  useEffect(() => { handleSignalRef.current = handleSignal; }, [handleSignal]);

  // A relay can stop forwarding RTP while the peer connection still reports
  // "connected". Watch inbound audio packets and restart ICE after 15 seconds
  // without transport progress. Muted/silent audio still emits RTP packets.
  useEffect(() => {
    if (callState !== "active") {
      lastInboundAudioPacketsRef.current = null;
      stalledAudioChecksRef.current = 0;
      return;
    }

    const monitor = setInterval(async () => {
      const pc = pcRef.current;
      if (!pc || pc.connectionState === "closed") return;
      try {
        const stats = await pc.getStats();
        let packetsReceived = 0;
        let foundInboundAudio = false;
        stats.forEach(report => {
          const mediaKind = report.kind ?? report.mediaType;
          if (report.type === "inbound-rtp" && mediaKind === "audio" && !report.isRemote) {
            foundInboundAudio = true;
            packetsReceived += Number(report.packetsReceived ?? 0);
          }
        });

        if (!foundInboundAudio) return;
        const previous = lastInboundAudioPacketsRef.current;
        lastInboundAudioPacketsRef.current = packetsReceived;
        // A lower value means the stats report/SSRC was replaced; establish a
        // new baseline instead of treating that replacement as a media stall.
        if (previous === null || packetsReceived > previous || packetsReceived < previous) {
          stalledAudioChecksRef.current = 0;
          return;
        }

        stalledAudioChecksRef.current += 1;
        if (stalledAudioChecksRef.current >= 3) {
          stalledAudioChecksRef.current = 0;
          void recoverIce();
        }
      } catch { /* peer connection may be closing */ }
    }, 5_000);

    return () => clearInterval(monitor);
  }, [callState, recoverIce]);

  // ─── SSE listener with auto-reconnect ─────────────────────────────────────
  const onReconnectRef = useRef(onReconnect);
  useEffect(() => { onReconnectRef.current = onReconnect; }, [onReconnect]);

  useEffect(() => {
    if (!meId) return;
    let es: EventSource | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;
    let retryDelay = 1000;
    let connectionCount = 0;

    function connect() {
      if (destroyed) return;
      const token = getBpToken();
      if (!token) return;

      es = new EventSource(`${BASE}/signaling/listen?token=${encodeURIComponent(token)}`);

      es.addEventListener("signal", (e: MessageEvent) => {
        retryDelay = 1000;
        try { handleSignalRef.current?.(JSON.parse(e.data) as SignalMsg); } catch { /* ignore */ }
      });

      es.addEventListener("message:new", (e: MessageEvent) => {
        retryDelay = 1000;
        try { onNewMessageRef.current?.(JSON.parse(e.data) as NewMessagePayload); } catch { /* ignore */ }
      });

      es.addEventListener("message:delivered", (e: MessageEvent) => {
        retryDelay = 1000;
        try {
          const { messageIds } = JSON.parse(e.data) as MessageStatusPayload;
          onMessageDeliveredRef.current?.(messageIds);
        } catch { /* ignore */ }
      });

      es.addEventListener("message:read", (e: MessageEvent) => {
        retryDelay = 1000;
        try {
          const { messageIds } = JSON.parse(e.data) as MessageStatusPayload;
          onMessageReadRef.current?.(messageIds);
        } catch { /* ignore */ }
      });

      es.addEventListener("connected", () => {
        retryDelay = 1000;
        connectionCount++;
        /* On reconnect (not first connect), sync missed read/delivered events */
        if (connectionCount > 1) {
          onReconnectRef.current?.();
        }
      });

      es.onerror = () => {
        es?.close();
        es = null;
        if (destroyed) return;
        retryDelay = Math.min(retryDelay * 2, 3_000);
        retryTimeout = setTimeout(connect, retryDelay);
      };
    }

    connect();

    // Bridge offline push notifications → call:invite signal
    const onSwCall = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (!d?.fromUserId) return;
      handleSignalRef.current?.({
        type: "call:invite",
        from: Number(d.fromUserId),
        payload: { callType: d.callType ?? "audio" },
      });
    };
    window.addEventListener("bp:sw-call", onSwCall);

    return () => {
      destroyed = true;
      if (retryTimeout) clearTimeout(retryTimeout);
      es?.close();
      window.removeEventListener("bp:sw-call", onSwCall);
    };
  }, [meId]);

  const startCall = useCallback(async (toUserId: number, type: "audio" | "video") => {
    if (callStateRef.current !== "idle") return;
    setMediaError(null);
    _setCallState("calling");
    _setCallPeerId(toUserId);
    setCallType(type);
    setCameraFront(true);

    try {
      const stream = await getMedia(type);
      localStreamRef.current = stream;
      setLocalStream(stream);
      await postSignal(toUserId, "call:invite", { callType: type });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Permission") || msg.includes("NotAllowed"))
        setMediaError("Accès refusé — autorisez la caméra/micro dans les paramètres.");
      else if (msg.includes("NotFound"))
        setMediaError("Caméra ou micro introuvable.");
      else
        setMediaError("Impossible d'accéder à la caméra/micro.");
      cleanup();
    }
  }, [cleanup]);

  const acceptCall = useCallback(async () => {
    const ic = incomingCall;
    if (!ic) return;
    stopRingtone();
    setMediaError(null);

    try {
      const stream = await getMedia(ic.callType);
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = buildPC(stream);
      pc.onicecandidate = ({ candidate }) => {
        if (candidate && callPeerIdRef.current !== null)
          postSignal(callPeerIdRef.current, "call:ice", { candidate: candidate.toJSON() });
      };

      _setCallState("active");
      await postSignal(ic.fromUserId, "call:accept", {});
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Permission") || msg.includes("NotAllowed"))
        setMediaError("Accès refusé — autorisez la caméra/micro dans les paramètres.");
      else
        setMediaError("Impossible d'accéder à la caméra/micro.");
      await postSignal(ic.fromUserId, "call:reject", { reason: "media_error" });
      cleanup();
    }
  }, [incomingCall, buildPC, cleanup]);

  const rejectCall = useCallback(async () => {
    stopRingtone();
    const peerId = callPeerIdRef.current;
    if (peerId !== null) await postSignal(peerId, "call:reject", {});
    cleanup();
  }, [cleanup]);

  const endCall = useCallback(async () => {
    stopRingtone();
    const peerId = callPeerIdRef.current;
    if (peerId !== null) await postSignal(peerId, "call:end", {});
    cleanup();
  }, [cleanup]);

  const toggleMute = useCallback(() => {
    const next = !isMutedRef.current;
    isMutedRef.current = next;
    setIsMuted(next);
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !next; });
  }, []);

  const toggleVideo = useCallback(() => {
    setIsVideoEnabled(prev => {
      const next = !prev;
      localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = next; });
      return next;
    });
  }, []);

  // ─── Mid-call renegotiation ───────────────────────────────────────────────
  // Used after removeTrack+addTrack so the remote's ontrack fires with the new track.
  const renegotiate = useCallback(async () => {
    const pc = pcRef.current;
    const peerId = callPeerIdRef.current;
    if (!pc || peerId === null || activeIceRestartIdRef.current || remoteIceRestartIdRef.current) return;
    try {
      if (pc.signalingState !== "stable" || makingOfferRef.current || activeRenegotiationIdRef.current) return;
      makingOfferRef.current = true;
      const negotiationId = `${meId}-renego-${++negotiationSequenceRef.current}-${Date.now()}`;
      activeRenegotiationIdRef.current = negotiationId;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (renegotiationDeadlineRef.current) clearTimeout(renegotiationDeadlineRef.current);
      renegotiationDeadlineRef.current = setTimeout(async () => {
        if (pcRef.current !== pc || activeRenegotiationIdRef.current !== negotiationId) return;
        try {
          if (pc.signalingState === "have-local-offer") {
            await pc.setLocalDescription({ type: "rollback" });
          }
        } catch { /* connection may already be closing */ }
        activeRenegotiationIdRef.current = null;
      }, 10_000);

      await postSignal(peerId, "call:renego", { sdp: pc.localDescription, negotiationId });
    } catch {
      if (renegotiationDeadlineRef.current) {
        clearTimeout(renegotiationDeadlineRef.current);
        renegotiationDeadlineRef.current = null;
      }
      try {
        if (pc.signalingState === "have-local-offer") {
          await pc.setLocalDescription({ type: "rollback" });
        }
      } catch { /* connection may already be closing */ }
      activeRenegotiationIdRef.current = null;
    }
    finally { makingOfferRef.current = false; }
  }, [meId]);

  // ─── Restore camera after screen share ends ───────────────────────────────
  const restoreCamera = useCallback(async () => {
    try {
      const camStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      const camTrack = camStream.getVideoTracks()[0];
      const pc = pcRef.current;
      if (pc && camTrack) {
        // Remove the screen video sender, then add the camera as a new sender.
        // This triggers ontrack on the remote side with the new camera track,
        // which is more reliable than replaceTrack across all browser/TURN combinations.
        pc.getSenders()
          .filter(s => s.track?.kind === "video" || s.track === null)
          .forEach(s => pc.removeTrack(s));
        pc.addTrack(camTrack);
        await renegotiate();
      }
      const audioTracks = localStreamRef.current?.getAudioTracks() ?? [];
      const combined = new MediaStream([...audioTracks, camTrack]);
      localStreamRef.current = combined;
      setLocalStream(combined);
    } catch { /* camera access denied or not available */ }
    setIsScreenSharing(false);
  }, [renegotiate]);

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      await restoreCamera();
    } else {
      // Start screen share
      try {
        const screenStream = await (navigator.mediaDevices as MediaDevices & {
          getDisplayMedia: (c: object) => Promise<MediaStream>;
        }).getDisplayMedia({ video: true, audio: false });

        const screenTrack = screenStream.getVideoTracks()[0];
        if (!screenTrack) return;

        const pc = pcRef.current;
        if (!pc) return;

        // Remove the camera video sender, then add the screen as a new sender.
        // removeTrack + addTrack + renegotiate triggers ontrack on the remote,
        // guaranteeing the remote's video element displays the screen content.
        pc.getSenders()
          .filter(s => s.track?.kind === "video")
          .forEach(s => pc.removeTrack(s));
        pc.addTrack(screenTrack);
        await renegotiate();

        const audioTracks = localStreamRef.current?.getAudioTracks() ?? [];
        const combined = new MediaStream([...audioTracks, screenTrack]);
        localStreamRef.current = combined;
        setLocalStream(combined);

        // When user clicks "Stop sharing" in the browser's native bar → restore camera
        screenTrack.onended = () => { restoreCamera(); };

        setIsScreenSharing(true);
      } catch { /* user cancelled picker or permission denied */ }
    }
  }, [isScreenSharing, renegotiate, restoreCamera]);

  const toggleSpeaker = useCallback(async (audioEl: HTMLAudioElement | null) => {
    const next = !isSpeaker;
    setIsSpeaker(next);
    if (!audioEl) return;
    // setSinkId routes audio output: "" = default earpiece, "speaker" = loudspeaker
    const el = audioEl as HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> };
    if (typeof el.setSinkId === "function") {
      try { await el.setSinkId(next ? "speaker" : ""); } catch { /* not supported */ }
    }
  }, [isSpeaker]);

  const flipCamera = useCallback(async () => {
    if (!localStreamRef.current) return;
    const newFront = !cameraFront;
    localStreamRef.current.getVideoTracks().forEach(t => t.stop());
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFront ? "user" : "environment", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      const newVideoTrack = newStream.getVideoTracks()[0];
      const audioTracks   = localStreamRef.current.getAudioTracks();
      const combined      = new MediaStream([...audioTracks, newVideoTrack]);
      localStreamRef.current = combined;
      setLocalStream(combined);
      const sender = pcRef.current?.getSenders().find(s => s.track?.kind === "video");
      if (sender && newVideoTrack) await sender.replaceTrack(newVideoTrack);
      setCameraFront(newFront);
    } catch { /* ignore */ }
  }, [cameraFront]);

  return {
    callState,
    callType,
    callPeerId,
    incomingCall,
    localStream,
    remoteStream,
    isMuted,
    isVideoEnabled,
    isScreenSharing,
    isSpeaker,
    cameraFront,
    callDuration,
    mediaError,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    toggleSpeaker,
    flipCamera,
  };
}
