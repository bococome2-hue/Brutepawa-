import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  apiGetPoll,
  apiGetPollVoters,
  apiTogglePollFollow,
  apiUpdatePoll,
  apiClosePoll,
  apiDeletePoll,
  apiPinPoll,
  PollDetail,
  PollVoter,
} from "../lib/api";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  ChevronLeft,
  Share2,
  MoreVertical,
  Clock,
  Bookmark,
  BarChart2,
  Check,
  ChevronRight,
  Trophy,
  Quote,
  Search,
  ChevronDown,
  Send,
  Pencil,
  Square,
  Pin,
  Link2,
  Settings,
  Trash2,
  Info,
  X,
  Lightbulb,
  Users,
  Eye,
  Heart,
  MoreHorizontal
} from "lucide-react";

interface PollResultsPageProps {
  pollId: number;
}

const getInitials = (name?: string) => {
  if (!name) return "?";
  return name.substring(0, 2).toUpperCase();
};

const Avatar = ({ url, name, sizeClass = "w-10 h-10", textClass = "text-[14px]" }: { url?: string | null, name?: string, sizeClass?: string, textClass?: string }) => {
  if (url) {
    return <img src={url} alt={name || ""} className={`${sizeClass} rounded-full object-cover bg-gray-100 border border-gray-100`} />;
  }
  return (
    <div className={`${sizeClass} rounded-full bg-[#22C55E] flex items-center justify-center text-white font-bold ${textClass} border border-[#16A34A] shrink-0`}>
      {getInitials(name)}
    </div>
  );
};

export default function PollResultsPage({ pollId }: PollResultsPageProps) {
  const queryClient = useQueryClient();

  const [filterOptionId, setFilterOptionId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [voters, setVoters] = useState<PollVoter[]>([]);
  const [hasMoreVoters, setHasMoreVoters] = useState(true);

  const [menuOpen, setMenuOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editQuestion, setEditQuestion] = useState("");
  const [editOptions, setEditOptions] = useState<string[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setInfoOpen(false);
        setShowCloseConfirm(false);
        setShowDeleteConfirm(false);
        setShowEdit(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const {
    data: poll,
    isLoading: isPollLoading,
    error: pollError,
  } = useQuery({
    queryKey: ["poll", pollId],
    queryFn: () => apiGetPoll(pollId),
    refetchInterval: 10000,
    enabled: !!pollId,
  });

  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const loadVoters = useCallback(
    async (reset = false) => {
      try {
        const currentCursor = reset ? undefined : cursor;
        const res = await apiGetPollVoters(
          pollId,
          20,
          currentCursor,
          filterOptionId || undefined,
          debouncedSearch,
        );
        if (reset) {
          setVoters(res.voters);
        } else {
          setVoters((prev) => {
            const newVoters = res.voters.filter(
              (v) => !prev.find((p) => p.userId === v.userId),
            );
            return [...prev, ...newVoters];
          });
        }
        setCursor(res.nextCursor);
        setHasMoreVoters(!!res.nextCursor);
      } catch (e) {
        console.error(e);
      }
    },
    [pollId, cursor, filterOptionId, debouncedSearch]
  );

  useEffect(() => {
    if (pollId) loadVoters(true);
  }, [pollId, filterOptionId, debouncedSearch]);

  const followMutation = useMutation({
    mutationFn: () => apiTogglePollFollow(pollId, !poll?.followedByMe),
    onSuccess: (res) => {
      queryClient.setQueryData(
        ["poll", pollId],
        (old: PollDetail | undefined) => {
          if (!old) return old;
          return { ...old, followedByMe: res.followedByMe };
        },
      );
      toast.success(
        res.followedByMe
          ? "Vous suivez ce sondage"
          : "Vous ne suivez plus ce sondage",
      );
    },
    onError: () => toast.error("Erreur"),
  });

  const closeMutation = useMutation({
    mutationFn: () => apiClosePoll(pollId),
    onSuccess: () => {
      toast.success("Sondage clôturé avec succès");
      queryClient.invalidateQueries({ queryKey: ["poll", pollId] });
      setShowCloseConfirm(false);
      setMenuOpen(false);
    },
    onError: () => toast.error("Impossible de clôturer le sondage"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiDeletePoll(pollId),
    onSuccess: () => {
      toast.success("Sondage supprimé");
      window.history.back();
    },
    onError: () => toast.error("Impossible de supprimer le sondage"),
  });

  const pinMutation = useMutation({
    mutationFn: () => apiPinPoll(pollId, !poll?.isPinned),
    onSuccess: (updated) => {
      queryClient.setQueryData(["poll", pollId], updated);
      toast.success(
        updated.isPinned ? "Sondage épinglé" : "Sondage désépinglé",
      );
      setMenuOpen(false);
    },
    onError: () => toast.error("Impossible d'épingler ce sondage"),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      apiUpdatePoll(pollId, {
        question: editQuestion.trim(),
        options: editOptions.map((option) => option.trim()),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["poll", pollId], updated);
      toast.success("Sondage modifié");
      setShowEdit(false);
      setMenuOpen(false);
    },
    onError: () => toast.error("Impossible de modifier le sondage"),
  });

  const openEditor = () => {
    if (!poll) return;
    setEditQuestion(poll.question);
    setEditOptions(
      [...poll.options]
        .sort((a, b) => a.position - b.position)
        .map((option) => option.text),
    );
    setShowEdit(true);
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/polls/${pollId}/results`;
    navigator.clipboard.writeText(url);
    toast.success("Lien copié dans le presse-papier");
    setMenuOpen(false);
  };

  const handleShare = () => {
    const url = `${window.location.origin}/polls/${pollId}/results`;
    if (navigator.share) {
      navigator
        .share({ title: "Sondage: " + (poll?.question || ""), url })
        .catch(() => {});
    } else {
      handleCopyLink();
    }
    setMenuOpen(false);
  };

  if (isPollLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#f0fdf4]">
        <div className="w-8 h-8 border-4 border-[#22C55E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (pollError || !poll) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#f0fdf4] text-red-500 font-bold">
        Sondage introuvable ou erreur de chargement.
      </div>
    );
  }

  const optionColors = [
    "#22C55E",
    "#EAB308",
    "#3B82F6",
    "#F97316",
    "#A855F7",
    "#EF4444",
  ];
  const sortedOptions = [...poll.options].sort(
    (a, b) => b.voteCount - a.voteCount,
  );
  const chartData = sortedOptions.map((opt, idx) => ({
    name: opt.text,
    value: opt.voteCount,
    color: optionColors[idx % optionColors.length],
  }));

  const avgAnswers =
    poll.uniqueParticipants > 0
      ? (poll.totalSelections / poll.uniqueParticipants).toFixed(1).replace(".", ",")
      : "0";

  const relativeTime = (value: string) => {
    const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
    const minutes = Math.floor(elapsed / 60000);
    if (minutes < 1) return "à l'instant";
    if (minutes < 60) return `il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `il y a ${hours} h`;
    return `il y a ${Math.floor(hours / 24)} j`;
  };

  const MenuItem = ({ icon: Icon, iconColor = "text-gray-900", title, sub, titleColor = "text-gray-900", onClick, testId }: any) => (
    <button type="button" onClick={onClick} data-testid={testId} className="w-full flex items-start gap-3 p-2.5 rounded-[16px] hover:bg-gray-50 active:bg-gray-100 cursor-pointer transition-colors text-left">
      <Icon size={18} className={`shrink-0 mt-0.5 ${iconColor}`} strokeWidth={2.5} fill={iconColor.includes("red") || iconColor.includes("fill") ? "currentColor" : "none"} />
      <div>
        <div className={`text-[13px] font-extrabold ${titleColor}`}>{title}</div>
        <div className="text-[11px] font-medium text-gray-500 leading-tight mt-0.5">{sub}</div>
      </div>
    </button>
  );

  const renderPollInfo = () => (
    <div className="bg-white rounded-[18px] sm:rounded-[24px] p-3.5 sm:p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-white relative z-10">
      <div className="flex items-center gap-2 mb-2.5 sm:mb-3">
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-[10px] sm:rounded-xl bg-[#22C55E] flex items-center justify-center text-white shadow-sm">
          <BarChart2 size={15} className="sm:w-4 sm:h-4" strokeWidth={3} />
        </div>
        <span className="text-[14px] sm:text-[16px] font-extrabold text-[#111827]">Sondage</span>
        {poll.multipleChoice && (
          <div className="ml-auto bg-[#DCFCE7] text-[#16A34A] px-2 sm:px-2.5 py-1 rounded-full text-[9px] sm:text-[12px] font-bold flex items-center gap-1 whitespace-nowrap">
            <Check size={12} strokeWidth={3} />
            Plusieurs réponses
          </div>
        )}
      </div>

      <h1 className="text-[16px] sm:text-[20px] md:text-[24px] font-black leading-[1.12] text-gray-900 mb-1.5">
        {poll.question}
      </h1>
      {poll.multipleChoice && (
        <p className="text-[11px] sm:text-[14px] text-gray-500 font-medium mb-3.5 sm:mb-4">
          Vous pouvez choisir plusieurs réponses
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-gray-100">
        <div className="flex items-center gap-1 sm:gap-1.5 text-[#16A34A] text-[11px] sm:text-[13px] font-bold whitespace-nowrap">
          <Users size={12} className="sm:w-4 sm:h-4" strokeWidth={2.5} />
          {poll.totalVotes} votes
        </div>
        {poll.expiresAt && (
          <div className="flex items-center gap-1 sm:gap-1.5 text-gray-500 text-[11px] sm:text-[13px] font-bold whitespace-nowrap">
            <Clock size={12} className="sm:w-4 sm:h-4" strokeWidth={2.5} />
            {new Date(poll.expiresAt).getTime() > Date.now()
              ? `Il reste ${Math.max(1, Math.floor((new Date(poll.expiresAt).getTime() - Date.now()) / 86400000))} jours`
              : "Terminé"}
          </div>
        )}
        <button
          onClick={() => followMutation.mutate()}
          data-testid="button-follow"
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3.5 py-1 sm:py-1.5 border border-gray-200 rounded-full text-[10px] sm:text-[13px] font-bold text-gray-700 bg-white shadow-sm active:scale-95 transition-transform ml-auto whitespace-nowrap"
        >
          <Bookmark size={12} className="sm:w-[15px] sm:h-[15px]" strokeWidth={2.5} fill={poll.followedByMe ? "currentColor" : "none"} />
          <span className="hidden sm:inline">{poll.followedByMe ? "Suivi" : "Suivre le sondage"}</span>
          <span className="sm:hidden">{poll.followedByMe ? "Suivi" : "Suivre"}</span>
        </button>
      </div>
    </div>
  );

  const renderAuthorAndStats = () => (
    <div className="bg-white rounded-[18px] sm:rounded-[24px] p-3 sm:p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-white flex flex-col relative z-10" data-testid="card-poll-statistics">

      {/* Author Top Part */}
      <div className="flex items-center justify-between w-full mb-3 sm:mb-5">
        <div className="text-left">
          <div className="text-[10px] sm:text-[13px] text-gray-500 leading-tight">
            Par <span className="font-extrabold text-gray-900">{poll.creator.name}</span>
          </div>
          <div className="text-[8px] sm:text-[12px] font-medium text-gray-400 mt-0.5 leading-tight">
            {new Date(poll.createdAt).toLocaleDateString("fr", { day: "numeric", month: "short", year: "numeric" })}{" "}
            à {new Date(poll.createdAt).toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
        <Avatar url={poll.creator.avatarUrl} name={poll.creator.name} sizeClass="w-7 h-7 sm:w-11 sm:h-11" textClass="text-[10px] sm:text-[14px]" />
      </div>

      {/* Doughnut Chart Part */}
      <div className="relative w-[108px] h-[108px] sm:w-[140px] sm:h-[140px] mx-auto mb-4 sm:mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData.length > 0 ? chartData : [{value: 1, color: '#F3F4F6'}]}
              cx="50%"
              cy="50%"
              innerRadius="65%"
              outerRadius="90%"
              paddingAngle={2}
              dataKey="value"
              stroke="none"
              animationDuration={1000}
            >
              {chartData.length > 0 ? chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              )) : <Cell fill="#F3F4F6" />}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-[24px] sm:text-[32px] font-black leading-none text-gray-900 mt-1">{poll.totalVotes}</div>
          <div className="text-[10px] sm:text-[13px] text-gray-500 font-bold mt-0.5 sm:mt-1">votes</div>
        </div>
      </div>

      {/* Stats List Part */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-5 h-5 sm:w-8 sm:h-8 rounded-full bg-[#ECFDF5] text-[#16A34A] flex items-center justify-center shrink-0">
            <Eye size={12} className="sm:w-4 sm:h-4" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-[11px] sm:text-[15px] font-extrabold text-gray-900 leading-none">
              {poll.viewsCount >= 1000 ? (poll.viewsCount / 1000).toFixed(1).replace(".0", "") + "K" : poll.viewsCount}
            </div>
            <div className="text-[9px] sm:text-[12px] text-gray-500 font-medium leading-tight mt-0.5">vues du sondage</div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-5 h-5 sm:w-8 sm:h-8 rounded-full bg-[#ECFDF5] text-[#16A34A] flex items-center justify-center shrink-0">
            <Users size={12} className="sm:w-4 sm:h-4" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-[11px] sm:text-[15px] font-extrabold text-gray-900 leading-none">{poll.uniqueParticipants}</div>
            <div className="text-[9px] sm:text-[12px] text-gray-500 font-medium leading-tight mt-0.5">participants uniques</div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-5 h-5 sm:w-8 sm:h-8 rounded-full bg-[#ECFDF5] text-[#16A34A] flex items-center justify-center shrink-0">
            <Check size={12} className="sm:w-4 sm:h-4" strokeWidth={3} />
          </div>
          <div className="flex-1">
            <div className="text-[11px] sm:text-[15px] font-extrabold text-gray-900 leading-none">{avgAnswers}</div>
            <div className="text-[9px] sm:text-[12px] text-gray-500 font-medium leading-tight mt-0.5">réponses en moyenne</div>
          </div>
          <button onClick={() => setInfoOpen(true)} data-testid="button-info" className="w-5 h-5 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-gray-400 border border-gray-200 hover:bg-gray-50 transition-colors shrink-0">
            <Info size={12} className="sm:w-3.5 sm:h-3.5" strokeWidth={2.5} />
          </button>
        </div>

        {poll.multipleChoice && (
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-5 h-5 sm:w-8 sm:h-8 rounded-full bg-[#ECFDF5] text-[#16A34A] flex items-center justify-center shrink-0">
              <BarChart2 size={12} className="sm:w-4 sm:h-4" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-[11px] sm:text-[15px] font-extrabold text-gray-900 leading-none">Plusieurs réponses</div>
              <div className="text-[9px] sm:text-[12px] text-gray-500 font-medium leading-tight mt-0.5">activé</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderOptions = () => (
    <div className="flex flex-col gap-2 sm:gap-3 relative z-10">
      {sortedOptions.map((opt, idx) => (
        <div
          key={opt.id}
          data-testid={`card-option-${opt.id}`}
          onClick={() => setFilterOptionId(opt.id === filterOptionId ? null : opt.id)}
          className={`bg-white rounded-[16px] sm:rounded-[20px] p-2.5 sm:p-3.5 cursor-pointer transition-all active:scale-[0.98] ${
            filterOptionId === opt.id ? "ring-2 ring-[#22C55E] shadow-md" : "shadow-sm border border-gray-100"
          } flex items-center sm:items-start gap-2 sm:gap-3`}
        >
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[#ECFDF5] text-[#22C55E] text-[12px] sm:text-[15px] font-extrabold flex items-center justify-center shrink-0">
            {idx + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center sm:items-start mb-1 sm:mb-2 gap-1.5 sm:gap-2">
              <div className="text-[12px] sm:text-[15px] font-extrabold text-gray-900 leading-tight line-clamp-2">
                {opt.text}
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] sm:text-[13px] font-extrabold text-gray-900 leading-none mb-0.5">{opt.voteCount} votes</div>
                <div className="text-[9px] sm:text-[12px] font-bold text-gray-500 leading-none">{Math.round(opt.percentage)}%</div>
              </div>
            </div>

            <div className="w-full h-[5px] sm:h-[6px] bg-gray-100 rounded-full overflow-hidden mb-1.5 sm:mb-3">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, opt.percentage))}%`, backgroundColor: optionColors[idx % optionColors.length] }}
              />
            </div>

            <div className="flex items-center justify-between h-[20px] sm:h-auto">
              <div className="flex items-center">
                {opt.votersPreview && opt.votersPreview.length > 0 && (
                  <div className="flex -space-x-1 sm:-space-x-1.5 mr-1.5 sm:mr-2">
                    {opt.votersPreview.slice(0, 5).map((v) => (
                      <div key={v.userId} className="w-4 h-4 sm:w-6 sm:h-6 rounded-full border border-white sm:border-2 bg-gray-200 overflow-hidden shrink-0">
                        {v.avatarUrl ? (
                          <img src={v.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-[#22C55E] flex items-center justify-center text-white text-[7px] sm:text-[9px] font-bold">
                            {getInitials(v.name)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {opt.remainingVoters > 0 && (
                  <span className="text-[9px] sm:text-[12px] text-gray-500 font-bold">+{opt.remainingVoters}</span>
                )}
              </div>
              <ChevronRight size={14} className="text-gray-400 sm:w-[18px] sm:h-[18px]" strokeWidth={2.5} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderPopular = () => {
    return (
      <div data-testid="card-popular" className="bg-gradient-to-r from-[#16A34A] to-[#22C55E] rounded-[16px] sm:rounded-[24px] p-3 sm:p-4 flex items-center gap-2 sm:gap-3 text-white shadow-[0_8px_24px_rgba(34,197,94,0.2)] cursor-pointer active:scale-[0.98] transition-transform relative z-10">
        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
          <Trophy size={16} className="sm:w-5 sm:h-5" strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] sm:text-[15px] font-extrabold mb-0.5 truncate">Sondage populaire</div>
          <div className="text-[9px] sm:text-[12px] text-white/90 font-medium leading-tight line-clamp-2">
            Ce sondage suscite un grand intérêt dans la communauté
          </div>
        </div>
        <ChevronRight size={16} className="sm:w-5 sm:h-5 text-white/80" strokeWidth={2.5} />
      </div>
    );
  };

  const renderOpinion = () => (
    <div data-testid="card-opinion" className="bg-[#f0fdf4] rounded-[16px] sm:rounded-[24px] p-3 sm:p-4 flex items-center gap-2 sm:gap-3 shadow-sm border border-[#dcfce7] cursor-pointer active:scale-[0.98] transition-transform relative z-10">
      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#dcfce7] rounded-full flex items-center justify-center text-[#16A34A] shrink-0 font-black">
        <Quote size={14} className="sm:w-5 sm:h-5" strokeWidth={3} fill="currentColor" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] sm:text-[15px] font-extrabold text-gray-900 mb-0.5 truncate">Votre avis compte !</div>
        <div className="text-[9px] sm:text-[12px] text-gray-600 font-medium leading-tight line-clamp-2">
          Merci à tous pour votre participation 🙏
        </div>
      </div>
      <ChevronRight size={16} className="text-gray-400 sm:w-5 sm:h-5" strokeWidth={2.5} />
    </div>
  );

  const renderVoters = () => (
    <div className="bg-white rounded-[16px] sm:rounded-[24px] p-3 sm:p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-100 flex flex-col gap-3 sm:gap-4 relative z-10">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Users size={16} className="sm:w-[18px] sm:h-[18px] text-[#22C55E]" strokeWidth={3} />
          <span className="text-[12px] sm:text-[16px] font-extrabold text-gray-900 whitespace-nowrap">Tous les votants ({poll.uniqueParticipants})</span>
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="relative">
            <select
              value={filterOptionId || ""}
              onChange={(e) => setFilterOptionId(e.target.value ? Number(e.target.value) : null)}
              data-testid="select-filter"
              className="appearance-none bg-white border border-gray-200 rounded-full px-2 sm:px-3 py-1.5 pr-6 sm:pr-8 text-[9px] sm:text-[12px] font-bold text-gray-700 outline-none w-[92px] sm:w-auto"
            >
              <option value="">Toutes les options</option>
              {sortedOptions.map((o) => (
                <option key={o.id} value={o.id}>{o.text}</option>
              ))}
            </select>
            <ChevronDown size={12} className="sm:w-[14px] sm:h-[14px] absolute right-2 sm:right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" strokeWidth={3} />
          </div>
          <div className="relative min-w-0 w-[86px] sm:w-auto">
            <Search size={12} className="sm:w-[14px] sm:h-[14px] absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-gray-400" strokeWidth={2.5} />
            <input
              type="text"
              placeholder="Rechercher"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-[130px] bg-white border border-gray-200 rounded-full py-1.5 pl-7 sm:pl-8 pr-2 text-[9px] sm:text-[12px] font-medium outline-none placeholder:text-gray-400"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2.5 sm:gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x">
        {voters.map((v) => (
          <div key={v.userId} className="flex flex-col items-center gap-1 sm:gap-1.5 shrink-0 w-[45px] sm:w-[60px] snap-start">
            <div className="relative">
              <Avatar url={v.avatarUrl} name={v.name} sizeClass="w-9 h-9 sm:w-12 sm:h-12" textClass="text-[12px] sm:text-[16px]" />
              {v.isOnline && <span className="absolute right-0 bottom-0 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#22C55E] border-[1.5px] sm:border-2 border-white" />}
            </div>
            <div className="flex flex-col items-center w-full">
              <div className="text-[9px] sm:text-[12px] font-extrabold text-gray-900 truncate w-full text-center leading-tight">{v.name.split(" ")[0]}</div>
              <div className="text-[8px] sm:text-[10px] font-bold text-gray-400 truncate w-full text-center leading-tight mt-0.5">{relativeTime(v.votedAt)}</div>
            </div>
          </div>
        ))}
        {hasMoreVoters && (
          <div onClick={() => loadVoters()} className="flex flex-col items-center gap-1 sm:gap-1.5 shrink-0 w-[45px] sm:w-[60px] cursor-pointer active:scale-95 snap-start pt-0.5">
            <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 shadow-sm">
              <MoreHorizontal size={16} className="sm:w-5 sm:h-5" strokeWidth={2.5} />
            </div>
            <div className="text-[9px] sm:text-[12px] font-extrabold text-gray-900 mt-1">Voir plus</div>
          </div>
        )}
      </div>
    </div>
  );

  const renderShareFooter = () => (
    <div className="flex flex-col items-center gap-2 sm:gap-3 pt-1 pb-safe relative z-10">
      <button
        onClick={handleShare}
        data-testid="button-share-main"
        className="w-full bg-[#22C55E] hover:bg-[#16A34A] active:bg-[#15803D] text-white rounded-full py-2.5 sm:py-3.5 font-extrabold text-[14px] sm:text-[16px] flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(34,197,94,0.3)] transition-all active:scale-[0.98]"
      >
        <Send size={16} className="sm:w-[18px] sm:h-[18px]" strokeWidth={2.5} />
        Partager ce sondage
      </button>
      <div className="text-[9px] sm:text-[11px] font-bold text-gray-500 flex items-center gap-1.5">
        BrutePawa <Heart size={10} className="sm:w-3 sm:h-3 text-[#22C55E]" fill="#22C55E" /> Plus qu'un réseau, une communauté
      </div>
    </div>
  );

  return (
    <div className="w-full min-h-[100dvh] bg-[#f0fdf4] text-[#111827] font-sans relative overflow-x-hidden">
      <style>{`
        .animation-fade-in { animation: fadeIn 0.2s ease-out forwards; }
        .animation-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .pb-safe { padding-bottom: max(16px, env(safe-area-inset-bottom)); }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Decorative background blobs */}
      <div className="fixed top-0 left-0 right-0 h-[400px] bg-gradient-to-b from-[#dcfce7] to-transparent pointer-events-none z-0 opacity-70" />
      <div className="fixed -top-40 -right-40 w-[400px] h-[400px] bg-[#bbf7d0] rounded-full blur-[100px] pointer-events-none z-0 opacity-40" />
      <div className="fixed top-20 -left-20 w-[300px] h-[300px] bg-[#86efac] rounded-full blur-[100px] pointer-events-none z-0 opacity-20" />

      {/* HEADER */}
      <header className="sticky top-0 z-20 bg-white/70 backdrop-blur-xl flex items-center justify-between px-4 py-3 pb-4 border-b border-gray-100/50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-900 active:scale-95 transition-transform border border-gray-50"
            aria-label="Retour"
            data-testid="button-back"
          >
            <ChevronLeft size={24} strokeWidth={2.5} />
          </button>
          <div>
            <div className="text-[18px] sm:text-[20px] font-extrabold text-gray-900 leading-tight">
              Résultats du sondage
            </div>
            <div className="text-[12px] text-gray-500 font-bold">
              Détails et statistiques complètes
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="w-10 h-10 rounded-full bg-[#dcfce7] flex items-center justify-center text-[#16A34A] active:scale-95 transition-transform"
            aria-label="Partager"
            data-testid="button-share-header"
          >
            <Share2 size={18} strokeWidth={2.5} />
          </button>
          {poll.canManage && (
            <button
              onClick={() => setMenuOpen(true)}
              className="w-10 h-10 rounded-full bg-[#dcfce7] flex items-center justify-center text-[#16A34A] active:scale-95 transition-transform"
              aria-label="Menu"
              data-testid="button-menu"
            >
              <MoreVertical size={20} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-[1040px] mx-auto px-4 py-4 md:py-6 relative z-10">
        {/* Unified Mobile + Desktop Flow */}
        <div className="flex flex-col gap-2.5 sm:gap-4 w-full">
          <div className="grid grid-cols-[1.8fr_1fr] gap-2.5 sm:gap-5 items-start">
            <div className="flex flex-col gap-2.5 sm:gap-5 min-w-0">
              {renderPollInfo()}
              {renderOptions()}
            </div>
            <div className="flex flex-col gap-2.5 sm:gap-5 min-w-0">
              {renderAuthorAndStats()}
              {renderPopular()}
              {renderOpinion()}
            </div>
          </div>
          <div className="flex flex-col gap-2.5 sm:gap-4">
            {renderVoters()}
            {renderShareFooter()}
          </div>
        </div>
      </main>

      {/* MENU MODAL */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animation-fade-in" onClick={() => setMenuOpen(false)} />
          <div className="w-full max-w-[360px] bg-white rounded-[24px] overflow-hidden shadow-2xl relative z-10 animation-slide-up flex flex-col">
            <div className="flex items-center gap-3 p-4 border-b border-gray-100">
              <div className="w-10 h-10 rounded-full bg-[#22C55E] flex items-center justify-center text-white shrink-0">
                <MoreVertical size={22} strokeWidth={2.5} />
              </div>
              <div className="flex-1">
                <div className="text-[17px] font-black text-gray-900 leading-tight">Menu des trois points</div>
                <div className="text-[12px] font-bold text-[#22C55E] leading-tight">Rôle pour l'auteur du sondage</div>
              </div>
              <button onClick={() => setMenuOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 bg-gray-50 active:scale-95 transition-transform">
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            <div className="flex flex-col p-2 overflow-y-auto max-h-[60vh]">
              <MenuItem icon={Pencil} title="Modifier le sondage" sub="Changer la question, les options, la durée..." onClick={openEditor} testId="menu-edit" />
              <MenuItem icon={Square} iconColor="text-red-500" title="Clôturer le sondage" sub="Mettre fin au sondage immédiatement" onClick={() => setShowCloseConfirm(true)} testId="menu-close" />
              <MenuItem icon={Pin} iconColor="text-red-500" title={poll.isPinned ? "Désépingler le sondage" : "Épingler le sondage"} sub="Le garder en haut de la page" onClick={() => pinMutation.mutate()} testId="menu-pin" />
              <MenuItem icon={Link2} title="Copier le lien" sub="Obtenir le lien direct du sondage" onClick={handleCopyLink} testId="menu-copy" />
              <MenuItem icon={Share2} title="Partager" sub="Partager sur BrutePawa ou ailleurs" onClick={handleShare} testId="menu-share" />
              <MenuItem icon={BarChart2} title="Voir les statistiques détaillées" sub="Accéder à toutes les données" onClick={() => { setMenuOpen(false); document.querySelector('[data-testid="card-poll-statistics"]')?.scrollIntoView({ behavior: "smooth", block: "center" }); }} testId="menu-stats" />
              <MenuItem icon={Settings} title="Gérer les paramètres" sub="Ajuster les réglages avancés" onClick={openEditor} testId="menu-settings" />
              <MenuItem icon={Trash2} iconColor="text-red-500" titleColor="text-red-500" title="Supprimer le sondage" sub="Supprimer définitivement le sondage" onClick={() => setShowDeleteConfirm(true)} testId="menu-delete" />
            </div>

            <div className="bg-[#16A34A] text-white p-3.5 flex items-start gap-2.5 mx-2 mb-2 rounded-2xl">
               <Lightbulb size={20} strokeWidth={2.5} className="text-yellow-300 shrink-0 mt-0.5" fill="currentColor" />
               <div className="text-[12px] font-bold leading-snug">
                 Ce menu permet à l'auteur de contrôler et gérer entièrement son sondage.
               </div>
            </div>
          </div>
        </div>
      )}

      {/* INFO MODAL */}
      {infoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animation-fade-in" onClick={() => setInfoOpen(false)}>
          <div className="bg-white w-full max-w-[360px] rounded-[24px] p-5 shadow-2xl flex flex-col gap-4 animation-slide-up" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#22C55E] flex items-center justify-center text-white shrink-0">
                  <Info size={20} strokeWidth={3} />
                </div>
                <div>
                  <div className="text-[18px] font-extrabold text-gray-900 leading-tight">Icône d'information</div>
                  <div className="text-[13px] font-bold text-[#22C55E]">Rôle pour l'auteur du sondage</div>
                </div>
              </div>
              <button onClick={() => setInfoOpen(false)} data-testid="button-close-info" className="p-2 text-gray-400 bg-gray-50 hover:bg-gray-100 rounded-full active:scale-95 transition-colors">
                <X size={20} strokeWidth={3} />
              </button>
            </div>

            <div className="flex items-start gap-3 p-2 mt-2">
              <div className="w-8 h-8 rounded-full bg-[#1E3A8A] flex items-center justify-center text-white shrink-0 mt-0.5">
                <Info size={16} strokeWidth={3} />
              </div>
              <div>
                <div className="text-[15px] font-extrabold text-gray-900">Réponses en moyenne</div>
                <div className="text-[13px] font-medium text-gray-500 leading-tight mt-1">
                  Nombre moyen d'options sélectionnées par participant, car ce sondage autorise plusieurs réponses.
                </div>
              </div>
            </div>

            <div className="bg-[#22C55E] rounded-[16px] p-3.5 flex items-start gap-3 text-white mt-2">
              <Lightbulb size={20} className="shrink-0 mt-0.5" strokeWidth={2.5} fill="currentColor" />
              <div className="text-[13px] font-bold leading-tight pt-0.5">
                Cette icône sert à expliquer la statistique. Elle n'a pas d'action de modification.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Editor Modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-[20px] p-5 w-full max-w-sm max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Modifier le sondage</h3>
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Question
              </label>
              <textarea
                value={editQuestion}
                onChange={(e) => setEditQuestion(e.target.value)}
                className="w-full border rounded-xl p-2 bg-gray-50"
                rows={3}
              />
            </div>
            <div className="mb-5">
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Options
              </label>
              {editOptions.map((opt, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <input
                    value={opt}
                    maxLength={200}
                    data-testid={`input-edit-option-${idx}`}
                    onChange={(e) => {
                      const newOpts = [...editOptions];
                      newOpts[idx] = e.target.value;
                      setEditOptions(newOpts);
                    }}
                    className="flex-1 border rounded-xl p-2 bg-gray-50"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEdit(false)}
                data-testid="button-cancel-edit"
                className="flex-1 py-2 rounded-xl font-bold bg-gray-100"
              >
                Annuler
              </button>
              <button
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending || !editQuestion.trim() || editOptions.some((option) => !option.trim())}
                data-testid="button-save-edit"
                className="flex-1 py-2 rounded-xl font-bold bg-[#22C55E] text-white"
              >
                {updateMutation.isPending ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Confirm */}
      {showCloseConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-[20px] p-5 w-full max-w-sm">
            <h3 className="text-[18px] font-extrabold text-gray-900 mb-2">Clôturer le sondage ?</h3>
            <p className="text-[14px] text-gray-500 font-medium mb-5">Les utilisateurs ne pourront plus voter.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCloseConfirm(false)}
                data-testid="button-cancel-confirm"
                className="flex-1 py-2.5 rounded-full font-bold bg-gray-100 text-gray-700 active:scale-95 transition-transform"
              >
                Annuler
              </button>
              <button
                onClick={() => closeMutation.mutate()}
                disabled={closeMutation.isPending}
                data-testid="button-confirm-close"
                className="flex-1 py-2.5 rounded-full font-bold bg-red-500 text-white active:scale-95 transition-transform shadow-lg shadow-red-500/20"
              >
                {closeMutation.isPending ? "En cours..." : "Clôturer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-[20px] p-5 w-full max-w-sm">
            <h3 className="text-[18px] font-extrabold text-gray-900 mb-2">Supprimer le sondage ?</h3>
            <p className="text-[14px] text-gray-500 font-medium mb-5">Cette action est irréversible et supprimera tous les votes.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                data-testid="button-cancel-delete"
                className="flex-1 py-2.5 rounded-full font-bold bg-gray-100 text-gray-700 active:scale-95 transition-transform"
              >
                Annuler
              </button>
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                data-testid="button-confirm-delete"
                className="flex-1 py-2.5 rounded-full font-bold bg-red-500 text-white active:scale-95 transition-transform shadow-lg shadow-red-500/20"
              >
                {deleteMutation.isPending ? "Suppression..." : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
