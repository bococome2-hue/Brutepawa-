import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "../router";
import { apiGetPoll, apiVotePoll } from "../lib/api";
import { toast } from "sonner";

interface Props {
  pollId: number;
  msgId: number;
  mine: boolean;
  time: string;
  status?: string;
  onProfile?: () => void;
}

export default function PollMessageCard({ pollId, msgId, mine, time, status, onProfile }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: poll, isLoading } = useQuery({
    queryKey: ["poll", pollId],
    queryFn: () => apiGetPoll(pollId),
    refetchInterval: 10000,
  });

  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);

  useEffect(() => {
    if (poll) {
      setSelectedOptions(poll.myOptionIds || []);
    }
  }, [poll]);

  const voteMutation = useMutation({
    mutationFn: (optionIds: number[]) => apiVotePoll(pollId, optionIds),
    onSuccess: (updatedPoll) => {
      queryClient.setQueryData(["poll", pollId], updatedPoll);
    },
    onError: (err: any) => {
      toast.error(err.message || "Erreur lors du vote");
    }
  });

  const toggleOption = (optId: number) => {
    if (!poll) return;
    if (poll.multipleChoice) {
      setSelectedOptions(prev =>
        prev.includes(optId) ? prev.filter(id => id !== optId) : [...prev, optId]
      );
    } else {
      setSelectedOptions([optId]);
    }
  };

  const handleVote = () => {
    if (selectedOptions.length === 0) return;
    voteMutation.mutate(selectedOptions);
  };

  if (isLoading || !poll) {
    return (
      <div style={{
        background: mine ? "rgba(200, 230, 178, 0.5)" : "rgba(255, 255, 255, 0.8)",
        borderRadius: mine ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
        padding: "16px",
        minWidth: 280, maxWidth: 320,
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        marginBottom: 2
      }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
          <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#E5E7EB" }} />
          <div style={{ width: 60, height: 14, borderRadius: 4, background: "#E5E7EB" }} />
        </div>
        <div style={{ width: "100%", height: 20, borderRadius: 4, background: "#E5E7EB", marginBottom: 16 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ height: 40, borderRadius: 8, background: "#E5E7EB" }} />
          <div style={{ height: 40, borderRadius: 8, background: "#E5E7EB" }} />
        </div>
      </div>
    );
  }

  const hasVoted = (poll.myOptionIds && poll.myOptionIds.length > 0);
  const optionsChanged = JSON.stringify(selectedOptions.slice().sort()) !== JSON.stringify([...(poll.myOptionIds || [])].sort());
  const isMultiple = poll.multipleChoice;

  return (
    <div style={{
      position: "relative",
      background: mine
        ? "linear-gradient(145deg, #F4FFF7 0%, #E2F9E9 100%)"
        : "linear-gradient(145deg, #FFFFFF 0%, #ECFAF1 100%)",
      border: "1px solid rgba(22,163,74,.10)",
      borderRadius: mine ? "22px 5px 18px 22px" : "5px 22px 22px 18px",
      padding: "13px 12px 28px",
      width: "100%",
      minWidth: 0,
      boxSizing: "border-box",
      boxShadow: "0 10px 28px rgba(4,120,87,.12), 0 2px 7px rgba(15,23,42,.07)",
      marginBottom: 2,
      display: "flex",
      flexDirection: "column",
      gap: 9,
      overflow: "visible"
    }}>
      {mine && <div style={{
        position: "absolute", top: -1, right: -8, width: 16, height: 18,
        background: "linear-gradient(135deg, #F3FFF6 45%, transparent 46%)",
        filter: "drop-shadow(1px 1px 0 rgba(22,163,74,.08))",
        pointerEvents: "none"
      }} />}

      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(145deg,#34D399,#059669)", boxShadow: "0 3px 9px rgba(5,150,105,.28)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
          </div>
          <span style={{ fontSize: 13, fontWeight: 800, color: "#102A1B", whiteSpace: "nowrap" }}>Sondage</span>
        </div>
        {isMultiple && (
          <div style={{ marginLeft: "auto", background: "#D8FAE5", color: "#119257", padding: "4px 7px", borderRadius: 999, fontSize: "clamp(9px, 2.6vw, 10.5px)", fontWeight: 800, display: "flex", alignItems: "center", gap: 3, whiteSpace: "nowrap", minWidth: 0 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
            Plusieurs réponses
          </div>
        )}
        <div aria-hidden="true" style={{ flexShrink: 0, width: 14, color: "#176B46", fontSize: 21, lineHeight: 1, textAlign: "center" }}>⋮</div>
      </div>

      {/* QUESTION */}
      <div style={{ fontSize: 18, fontWeight: 850, color: "#101C16", lineHeight: 1.23, letterSpacing: "-.28px", marginTop: 1 }}>
        {poll.question}
      </div>
      {isMultiple && (
        <div style={{ fontSize: 12.5, color: "#68736C", marginTop: -5, lineHeight: 1.35 }}>
          Vous pouvez choisir plusieurs réponses
        </div>
      )}

      {/* OPTIONS */}
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {poll.options.map((opt, idx) => {
          const isSelected = selectedOptions.includes(opt.id);
          return (
            <div
              key={opt.id}
              onClick={() => toggleOption(opt.id)}
              style={{
                position: "relative",
                background: "rgba(255,255,255,.94)",
                border: isSelected ? "1.5px solid #16B96D" : "1px solid rgba(148,163,184,.18)",
                borderRadius: 13,
                padding: hasVoted ? "8px 9px" : "10px 11px",
                cursor: "pointer",
                overflow: "hidden",
                transition: "all 0.15s ease",
                boxShadow: isSelected ? "0 4px 12px rgba(16,185,129,.13)" : "0 3px 10px rgba(15,23,42,.045)"
              }}
            >
              {/* Progress Bar Background */}
              {hasVoted && (
                <div style={{
                  position: "absolute",
                  left: 0, top: 0, bottom: 0,
                   width: `${Math.min(100, Math.max(0, opt.percentage))}%`,
                   background: "linear-gradient(90deg,rgba(16,185,129,.13),rgba(52,211,153,.06))",
                  transition: "width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)"
                }} />
              )}

               <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: hasVoted ? 37 : 23, gap: 5 }}>
                 <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0, flex: 1 }}>
                  {/* Checkbox */}
                  <div style={{
                     width: 21, height: 21, borderRadius: isMultiple ? 6 : 11,
                    border: isSelected ? "none" : "2px solid #D1D5DB",
                     background: isSelected ? "linear-gradient(145deg,#22C77A,#059669)" : "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.15s ease"
                  }}>
                    {isSelected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>}
                  </div>

                   <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                     <span style={{ fontSize: 13.5, fontWeight: isSelected ? 750 : 650, color: "#17211C", lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {opt.text}
                    </span>
                    {/* Tiny inline bar when voted */}
                    {hasVoted && (
                       <div style={{ width: "100%", maxWidth: 145, height: 5, background: "#DDF5E7", borderRadius: 5, marginTop: 5, overflow: "hidden" }}>
                         <div style={{ height: "100%", width: `${Math.min(100, Math.max(0, opt.percentage))}%`, background: "linear-gradient(90deg,#059669,#20C77A)", borderRadius: 5, transition: "width .45s ease" }} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats on the right (if voted) */}
                {hasVoted && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0, minWidth: 39 }}>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      {opt.votersPreview && opt.votersPreview.length > 0 && (
                        <div style={{ display: "flex", marginRight: 6 }}>
                          {opt.votersPreview.slice(0, 3).map((v, i) => (
                             <img key={v.userId} src={v.avatarUrl || ""} alt="" style={{ width: 20, height: 20, borderRadius: "50%", border: "1.5px solid #fff", marginLeft: i > 0 ? -6 : 0, objectFit: "cover", background: "#E5E7EB" }} />
                          ))}
                        </div>
                      )}
                      <span style={{ fontSize: 13, fontWeight: 800, color: "#111827" }}>{opt.voteCount}</span>
                    </div>
                    <span style={{ fontSize: 11, color: "#6B7280" }}>({Math.round(opt.percentage)}%)</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* FOOTER INFO */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 5, marginTop: 3, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0, whiteSpace: "nowrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#16A34A", fontSize: 11, fontWeight: 700 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            {poll.totalVotes} vote{poll.totalVotes > 1 ? "s" : ""}
          </div>
          {poll.expiresAt && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#6B7280", fontSize: 11, fontWeight: 600 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              {new Date(poll.expiresAt).getTime() - Date.now() > 0 ? `Il reste ${Math.max(1, Math.floor((new Date(poll.expiresAt).getTime() - Date.now()) / 86400000))} jour(s)` : "Terminé"}
            </div>
          )}
        </div>
        <button
          onClick={() => navigate(`/polls/${pollId}/results`)}
           style={{
             background: "rgba(255,255,255,.92)", border: "1px solid rgba(16,185,129,.20)", borderRadius: 16,
             padding: "6px 8px", fontSize: 11.5, fontWeight: 800, color: "#16231C",
             display: "flex", alignItems: "center", gap: 5, boxShadow: "0 3px 9px rgba(5,150,105,.08)",
             cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--bp-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
          Voir les votes
        </button>
      </div>

      {/* VOTE BUTTON */}
      <button
          onClick={handleVote}
          disabled={selectedOptions.length === 0 || voteMutation.isPending || !optionsChanged}
          style={{
             background: selectedOptions.length > 0
               ? "linear-gradient(100deg,#059669 0%,#10B981 55%,#34D399 100%)"
               : "linear-gradient(100deg,#82DDB0,#6ED89F)",
            color: "#fff",
            border: "none",
             borderRadius: 17,
             padding: "13px",
             fontSize: 15.5,
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
             cursor: selectedOptions.length > 0 && optionsChanged ? "pointer" : "not-allowed",
             opacity: selectedOptions.length > 0 ? 1 : 0.64,
             marginTop: 3,
             boxShadow: selectedOptions.length > 0 ? "0 7px 17px rgba(5,150,105,.28)" : "none"
          }}
        >
           {!voteMutation.isPending && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>}
           {voteMutation.isPending ? "Envoi..." : "Voter maintenant"}
        </button>

      {/* BOTTOM INFO (Time & Status) */}
      <div style={{ position: "absolute", bottom: 6, right: 12, display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: mine ? "#15803D" : "#9CA3AF", fontWeight: 600 }}>
        {time}
        {mine && status && (
          status === "read" ? <svg viewBox="0 0 20 12" width="16" height="9" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 6l4 4 8-8" stroke="#0EA5E9"/><path d="M7 6l4 4 8-8" stroke="var(--bp-primary)"/></svg>
          : status === "delivered" ? <svg viewBox="0 0 20 12" width="16" height="9" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 6l4 4 8-8" stroke="currentColor"/><path d="M7 6l4 4 8-8" stroke="currentColor"/></svg>
          : <svg viewBox="0 0 16 12" width="12" height="9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 6l4 4 8-8"/></svg>
        )}
      </div>

    </div>
  );
}
