import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Activity, ArrowDownRight, ArrowUpRight, BarChart3, CalendarDays, ChevronDown, ChevronLeft,
  ChevronRight, Clock3, Eye, File, FileText, Film, Image, Info, Link2, MessageCircle,
  MessageSquare, Mic, MoreVertical, Pencil, Share2, Shield, Sparkles, Users, UserRoundPlus,
  Video, X, Zap, Heart, type LucideIcon,
} from "lucide-react";
import type { GroupStatistics } from "../hooks/useGroupStatistics";
import "./GroupStatisticsPanel.css";

type Period = "24h" | "7d" | "30d" | "90d";
type MessageTypes = Partial<Record<"total" | "text" | "images" | "videos" | "voice" | "files" | "gif" | "links" | "other", number | null>>;
type GrowthPoint = { day: string; members: number };
type ExtendedStatistics = GroupStatistics & {
  messagesInPeriod?: number | null;
  writersInPeriod?: number | null;
  viewsInPeriod?: number | null;
  readersInPeriod?: number | null;
  reactionsInPeriod?: number | null;
  repliesInPeriod?: number | null;
  sharesInPeriod?: number | null;
  leftInPeriod?: number | null;
  joinedInPeriod?: number | null;
  messageTypes?: MessageTypes | null;
  growth?: GrowthPoint[] | null;
  trends?: Record<string, number | null> | null;
};

interface Props {
  title: string;
  data: GroupStatistics | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onClose: () => void;
  period?: Period;
  onPeriodChange?: (period: Period) => void;
  onRangeChange?: (start: string, end: string) => void;
  onMembers?: () => void;
  onMedia?: () => void;
  onModeration?: () => void;
  /** Used only by the isolated reconstruction canvas, never by the live panel. */
  showDemoStatus?: boolean;
  demoMode?: boolean;
}

const fmtDay = (value?: string) => value
  ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }).replace(".", "")
  : "—";
const fmtDate = (value: string, zone?: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", ...(zone ? { timeZone: zone } : {}) }).format(date).replace(".", "");
};
const number = (value: number | null | undefined) => value == null ? "—" : new Intl.NumberFormat("fr-FR").format(value);
const periodNames: Record<Period, string> = { "24h": "24 dernières heures", "7d": "7 derniers jours", "30d": "30 derniers jours", "90d": "3 derniers mois" };
const periodChoices: { key: Period; label: string }[] = [
  { key: "24h", label: "24h" }, { key: "7d", label: "7j" }, { key: "30d", label: "30j" }, { key: "90d", label: "3 mois" },
];

type Detail = { title: string; description: string; rows?: { label: string; value: string }[] };

function SectionHeading({ icon: Icon, title, onMore, info = false }: {
  icon: LucideIcon; title: string; onMore: () => void; info?: boolean;
}) {
  return <div className="bp-section-heading">
    <span className="bp-section-icon"><Icon size={19} strokeWidth={2.2} /></span>
    <span className="bp-section-title">{title}</span>
    {info && <button className="bp-info-button" type="button" aria-label={`À propos : ${title}`} onClick={onMore}><Info size={15} /></button>}
    <button className="bp-more-link" type="button" onClick={onMore}>Voir plus <ChevronRight size={15} strokeWidth={2.4} /></button>
  </div>;
}

function GrowthGraph({ points, onDetail }: { points: GrowthPoint[] | null; onDetail: () => void }) {
  const drawable = points && points.length > 1;
  const maxMembers = points?.length ? Math.max(0, ...points.map(point => point.members)) : 0;
  const chartMax = Math.max(4, Math.ceil(maxMembers / 4) * 4);
  const coords = useMemo(() => {
    if (!drawable || !points) return [];
    return points.map((point, index) => ({
      x: 14 + index * (370 / (points.length - 1)),
      y: 86 - (Math.max(0, point.members) / chartMax) * 72,
    }));
  }, [chartMax, drawable, points]);
  const path = useMemo(() => {
    if (!coords.length) return "";
    return coords.reduce((line, point, i) => {
      if (i === 0) return `M ${point.x} ${point.y}`;
      const previous = coords[i - 1];
      const middle = (previous.x + point.x) / 2;
      return `${line} C ${middle} ${previous.y}, ${middle} ${point.y}, ${point.x} ${point.y}`;
    }, "");
  }, [coords]);
  const labels = points?.map(point => fmtDay(point.day)) ?? [];
  const ticks = Array.from({ length: 5 }, (_, index) => chartMax * (1 - index / 4));
  const last = points?.[points.length - 1];
  return <div className="bp-growth-plot" aria-label={drawable ? "Évolution des membres" : "Historique de croissance non disponible"}>
    <div className="bp-chart-ylabels" aria-hidden="true">{ticks.map((tick, index) => <span key={index}>{number(tick)}</span>)}</div>
    {drawable ? <svg className="bp-chart-svg" viewBox="0 0 398 96" preserveAspectRatio="none" role="img" aria-label="Courbe de croissance des membres">
      <defs><linearGradient id="bp-growth-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#22c55e" stopOpacity=".22" /><stop offset="100%" stopColor="#22c55e" stopOpacity=".025" /></linearGradient></defs>
      {[14, 32, 50, 68, 86].map(y => <line key={y} x1="14" y1={y} x2="384" y2={y} className="bp-chart-grid" />)}
      <line x1="14" y1="86" x2="384" y2="86" className="bp-chart-axis" />
      <line x1="14" y1="12" x2="14" y2="86" className="bp-chart-axis" />
      <path d={`${path} L 384 86 L 14 86 Z`} fill="url(#bp-growth-fill)" />
      <path d={path} className="bp-chart-line" />
      {coords.map((point, index) => <circle key={`${points?.[index]?.day}-${index}`} cx={point.x} cy={point.y} r="3.2" className="bp-chart-dot" />)}
    </svg> : <div className="bp-chart-untracked">
      <span className="bp-empty-chart-mark"><BarChart3 size={18} /></span>
      <span>Historique des membres non suivi</span>
      <span className="bp-empty-chart-detail">La courbe apparaîtra lorsque ces données seront disponibles.</span>
    </div>}
    {drawable && <div className="bp-chart-xlabels" aria-hidden="true">{labels.map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}</div>}
    {drawable && last && <div className="bp-chart-tooltip"><strong>{number(last.members)} membres</strong><span><i /> {fmtDay(last.day)}</span></div>}
    {!drawable && <button className="bp-chart-detail-hit" type="button" aria-label="Détails de la croissance" onClick={onDetail} />}
  </div>;
}

function MetricTile({ icon: Icon, label, value, active = false, color = "green", onClick }: {
  icon: LucideIcon; label: string; value: number | null | undefined; active?: boolean; color?: string; onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return <Tag type={onClick ? "button" : undefined} onClick={onClick} className={`bp-type-tile ${active ? "is-active" : ""} tone-${color}`}>
    <Icon size={16} strokeWidth={2} />
    <strong>{number(value)}</strong><span>{label}</span>
  </Tag>;
}

export default function GroupStatisticsPanel({
  title, data, loading, error, onRetry, onClose, period: controlledPeriod, onPeriodChange,
  onRangeChange, onMembers, onMedia, onModeration, showDemoStatus = false, demoMode = false,
}: Props) {
  const [innerPeriod, setInnerPeriod] = useState<Period>("7d");
  const [tab, setTab] = useState("Statistiques");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const screenRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = screenRef.current;
    if (!root) return;
    const previous = document.activeElement as HTMLElement | null;
    const scope = root.querySelector<HTMLElement>(".bp-detail-sheet, .bp-calendar-popover") ?? root;
    const focusable = () => [...scope.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [tabindex="0"]')]
      .filter(element => element.getClientRects().length > 0);
    if (scope !== root) focusable()[0]?.focus({ preventScroll: true });
    else if (!root.contains(document.activeElement)) root.focus({ preventScroll: true });
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (detail) setDetail(null);
        else if (menuOpen) setMenuOpen(false);
        else if (calendarOpen) setCalendarOpen(false);
        else onClose();
      } else if (event.key === "Tab") {
        const elements = focusable();
        const first = elements[0], last = elements[elements.length - 1];
        if (event.shiftKey && (document.activeElement === first || !scope.contains(document.activeElement))) {
          event.preventDefault(); last?.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !scope.contains(document.activeElement))) {
          event.preventDefault(); first?.focus();
        }
      }
    };
    document.addEventListener("keydown", keyboard);
    return () => {
      document.removeEventListener("keydown", keyboard);
      if (scope !== root && previous?.isConnected) previous.focus({ preventScroll: true });
    };
    // Polling must not reset focus through a changing data object or inline onClose callback.
  }, [detail?.title, menuOpen, calendarOpen]);
  const activePeriod = controlledPeriod ?? innerPeriod;
  const stats = data as ExtendedStatistics | null;
  const periodLabel = data ? `${fmtDay(data.periodStart)} — ${fmtDay(data.periodEnd)}` : periodNames[activePeriod];
  const metricInPeriod = (key: "messages" | "readers" | "writers" | "views") => {
    if (!stats) return null;
    const legacyWeek = activePeriod === "7d" && !stats.customRange;
    if (key === "messages") return activePeriod === "7d" && !stats.customRange
      ? stats.messagesInPeriod ?? stats.messagesLast7Days
      : stats.messagesInPeriod;
    if (key === "readers") return legacyWeek ? stats.readersLast7Days : stats.readersInPeriod;
    if (key === "writers") return legacyWeek ? stats.writersLast7Days : stats.writersInPeriod;
    return legacyWeek ? stats.viewsLast7Days : stats.viewsInPeriod;
  };
  const onTab = (name: string) => {
    setTab(name);
    if (name === "Membres") onMembers ? onMembers() : showDetail("Membres", "Liste des membres du groupe.", detailRows([["Membres", stats?.membersTotal]]));
    else if (name === "Médias") onMedia ? onMedia() : showDetail("Médias", "Répartition des médias partagés sur cette période.", detailRows([
      ["Images", typeCounts?.images], ["Vidéos", typeCounts?.videos], ["Vocaux", typeCounts?.voice],
      ["Fichiers", typeCounts?.files], ["GIF", typeCounts?.gif], ["Liens", typeCounts?.links], ["Autres", typeCounts?.other],
    ]));
    else if (name === "Modération") onModeration ? onModeration() : showDetail("Modération", "Seuls les administrateurs et modérateurs du groupe peuvent accéder à cette section.");
  };
  const showDetail = (titleText: string, description: string, rows?: Detail["rows"]) => setDetail({ title: titleText, description, rows });
  const periodDescription = stats?.customRange ? periodLabel : periodNames[activePeriod];
  const joinValue = stats?.joinedInPeriod;
  const leaveValue = stats?.leftInPeriod;
  const views = metricInPeriod("views");
  const typeCounts = stats?.messageTypes;
  const recent = stats?.recentActivity ?? [];
  const growth = stats?.growth ?? null;
  const cumulativeViews = (stats?.daily ?? []).reduce<number[]>((values, day) => {
    values.push((values[values.length - 1] ?? 0) + day.views);
    return values;
  }, []);
  const sparkViews = cumulativeViews.slice(-4);
  const sparkMax = Math.max(1, ...sparkViews);
  const trend = (key: string) => stats?.trends?.[key] == null ? "—"
    : `${stats.trends[key]! >= 0 ? "+" : ""}${number(stats.trends[key])}%`;
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: stats?.timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const chosenStart = startDate || data?.periodStart || "";
  const chosenEnd = endDate || data?.periodEnd || "";
  const validRange = !!chosenStart && !!chosenEnd && chosenStart <= chosenEnd && chosenEnd <= today
    && (Date.parse(chosenEnd) - Date.parse(chosenStart)) / 86400000 <= 92;
  const overviewMetrics: { icon: LucideIcon; label: string; value: number | null | undefined }[] = [
    { icon: Users, label: "Membres", value: stats?.membersTotal },
    { icon: MessageSquare, label: "Messages", value: metricInPeriod("messages") },
    { icon: Eye, label: "Membres lecteurs", value: metricInPeriod("readers") },
    { icon: Pencil, label: "Membres rédacteurs", value: metricInPeriod("writers") },
  ];
  const detailRows = (entries: [string, number | null | undefined][]) => entries.map(([label, value]) => ({ label, value: number(value) }));

  return createPortal(
    <div ref={screenRef} tabIndex={-1} className={`bp-stats-screen ${showDemoStatus ? "bp-demo-screen" : ""}`} role="dialog" aria-modal="true" aria-label={`Statistiques de ${title}`}>
      {showDemoStatus && <div className="bp-status-bar" aria-label="Barre d’état"><strong>18:14</strong><span className="bp-status-right"><i className="bp-cell-signal"><b /><b /><b /><b /></i><i className="bp-wifi-mark" /><i className="bp-battery">88</i></span></div>}
      <header className="bp-app-header">
        <button className="bp-header-icon bp-back" onClick={onClose} type="button" aria-label="Retour"><ChevronLeft size={22} /></button>
        <div className="bp-header-title">
          <strong>{title}</strong>
          <span className="bp-group-badge"><Users size={13} strokeWidth={2.4} /> Groupe</span>
        </div>
        <button className="bp-header-icon bp-menu-trigger" onClick={() => setMenuOpen(true)} type="button" aria-label="Ouvrir le menu"><MoreVertical size={22} /></button>
      </header>

      <nav className="bp-tabs-scroll" aria-label="Navigation du groupe">
        {[
          { name: "Statistiques", icon: BarChart3 }, { name: "Boosts", icon: Zap }, { name: "Membres", icon: Users },
          { name: "Médias", icon: Image }, { name: "Modération", icon: Shield },
        ].map(({ name, icon: Icon }) => <button key={name} type="button" aria-current={tab === name ? "page" : undefined} className={`bp-tab-pill ${tab === name ? "is-selected" : ""}`}
          onClick={() => name === "Boosts" ? (setTab(name), showDetail("Boosts", "Les boosts ne sont pas encore disponibles pour ce groupe.")) : onTab(name)}>
          <Icon size={15} strokeWidth={2} /><span>{name}</span>
        </button>)}
      </nav>

      <main className="bp-scroll-content">
        <div className="bp-range-row">
          <button type="button" className={`bp-date-button ${calendarOpen ? "is-open" : ""}`} onClick={() => setCalendarOpen(!calendarOpen)} aria-expanded={calendarOpen}>
            <CalendarDays size={15} /><span>{periodLabel}</span><ChevronDown size={14} />
          </button>
          <div className="bp-period-switch" aria-label="Période des statistiques">
            {periodChoices.map(({ key, label }) => <button type="button" key={key} className={activePeriod === key ? "is-selected" : ""}
              aria-pressed={activePeriod === key} onClick={() => { setInnerPeriod(key); onPeriodChange?.(key); }}>{label}</button>)}
          </div>
        </div>
        {calendarOpen && <div className="bp-calendar-popover">
          <label>Du <input type="date" max={today} value={startDate || data?.periodStart || ""} onChange={event => setStartDate(event.target.value)} /></label>
          <label>Au <input type="date" max={today} value={endDate || data?.periodEnd || ""} onChange={event => setEndDate(event.target.value)} /></label>
          <button type="button" disabled={!validRange || !onRangeChange} onClick={() => {
            const start = startDate || data?.periodStart;
            const end = endDate || data?.periodEnd;
            if (start && end) onRangeChange?.(start, end);
            setCalendarOpen(false);
          }}>Appliquer</button>
        </div>}

        {loading && !data && !error ? <div className="bp-loading-stack" role="status" aria-label="Chargement des statistiques">
          <div className="bp-skeleton bp-skeleton-overview" /><div className="bp-skeleton bp-skeleton-chart" /><div className="bp-skeleton bp-skeleton-small" />
        </div> : null}
        {error && <section className="bp-error-card" role="alert"><div><strong>Statistiques indisponibles</strong><span>{error}</span></div>
          <button type="button" onClick={onRetry}>Réessayer</button></section>}

        {(data || demoMode) && !error && <>
          <section className="bp-overview-card">
            <div className="bp-overview-art" aria-hidden="true"><i /><i /><i /><i /><ArrowUpRight size={33} /></div>
            <div className="bp-overview-head">
              <span className="bp-overview-icon"><BarChart3 size={21} strokeWidth={2.3} /></span>
              <div><h1>Vue d'ensemble <button type="button" className="bp-overview-info" aria-label="À propos de la vue d’ensemble" onClick={() => showDetail("Vue d’ensemble", `Les compteurs d’activité portent sur ${periodDescription}. Le nombre de membres correspond aux membres actuels du groupe, pas à un historique.`)}><Info size={15} /></button></h1><p>Résumé de l'activité de votre groupe sur cette période.</p></div>
            </div>
            <div className="bp-overview-grid">
              {overviewMetrics.map(({ icon: Icon, label, value }, index) => <button className="bp-overview-metric" key={label} type="button" onClick={() => label === "Membres" ? (onMembers ? onMembers() : showDetail("Membres", "Membres actuels du groupe.", detailRows([[label, value]]))) : showDetail(label, `${label} sur ${periodDescription}.`, detailRows([[label, value]]))}>
                <Icon className="bp-metric-icon" size={20} strokeWidth={2.3} />
                <strong>{number(value)}</strong><span>{label}</span>
                <small aria-label="Variation sur la période">{trend(["members", "messages", "readers", "writers"][index])}</small>
              </button>)}
            </div>
          </section>

          <section className="bp-section-card bp-growth-card">
            <SectionHeading icon={Activity} title="Croissance du groupe" info onMore={() => showDetail("Croissance du groupe", growth?.length ? "Évolution réelle du nombre de membres." : "Les données historiques de croissance ne sont pas suivies.", growth?.map(point => ({ label: fmtDay(point.day), value: number(point.members) })))} />
            <GrowthGraph points={growth} onDetail={() => showDetail("Croissance du groupe", "Les données historiques de croissance ne sont pas suivies.")} />
          </section>

          <section className="bp-member-cards">
            <button className="bp-member-card" type="button" onClick={() => showDetail("Nouveaux membres", joinValue == null ? "Aucune donnée de nouveaux membres n’est disponible pour cette période." : `${number(joinValue)} nouveaux membres sur ${periodDescription}.`, detailRows([["Nouveaux membres", joinValue]]))}>
              <span className="bp-member-icon join"><UserRoundPlus size={19} /></span>
              <span className="bp-member-card-main"><span className="bp-member-card-title">Nouveaux membres</span><strong>{number(joinValue)}</strong></span>
              <span className="bp-mini-more">Voir plus <ChevronRight size={13} /></span>
            </button>
            <button className="bp-member-card" type="button" onClick={() => showDetail("Membres partis", leaveValue == null ? "Aucune donnée des départs n’est disponible pour cette période." : `${number(leaveValue)} membres partis sur ${periodDescription}.`, detailRows([["Membres partis", leaveValue]]))}>
              <span className="bp-member-icon leave"><ArrowDownRight size={19} /></span>
              <span className="bp-member-card-main"><span className="bp-member-card-title">Membres partis</span><strong>{number(leaveValue)}</strong></span>
              <span className="bp-mini-more">Voir plus <ChevronRight size={13} /></span>
            </button>
          </section>

          <section className="bp-section-card bp-engagement-card">
            <SectionHeading icon={Sparkles} title="Consultations et réactions" info onMore={() => showDetail("Consultations et réactions", "Les consultations sont calculées selon la définition fournie par le groupe.", detailRows([["Vues", views], ["Réactions", stats?.reactionsInPeriod ?? stats?.reactionsLast7Days], ["Réponses", stats?.repliesInPeriod], ["Partages", stats?.sharesInPeriod]]))} />
            <div className="bp-engagement-grid">
              {[
                { label: "Vues", value: views, icon: Eye, tone: "green", activity: true },
                { label: "Réactions", value: stats?.reactionsInPeriod ?? stats?.reactionsLast7Days, icon: Heart, tone: "rose" },
                { label: "Réponses", value: stats?.repliesInPeriod, icon: MessageSquare, tone: "blue" },
                { label: "Partages", value: stats?.sharesInPeriod, icon: Share2, tone: "green" },
              ].map(({ label, value, icon: Icon, tone, activity }) => <div className={`bp-engagement-cell tone-${tone}`} key={label}>
                <div className="bp-engagement-value"><Icon size={19} strokeWidth={2.2} /><strong>{number(value)}</strong>{activity && value != null && <span className="bp-spark-bars" aria-label="Vues cumulées par jour">{sparkViews.map((views, index) => <i key={index} style={{ height: `${views / sparkMax * 18}px` }} />)}</span>}</div>
                <span>{label}</span>{label === "Vues" && <small>{periodDescription}</small>}
                {(label === "Réactions" || label === "Réponses" || label === "Partages") && value == null && <small>Non suivies</small>}
              </div>)}
            </div>
            {stats?.viewDefinition && <p className="bp-view-definition">{stats.viewDefinition}</p>}
          </section>

          <section className="bp-section-card bp-message-types-card">
            <SectionHeading icon={FileText} title="Types de messages" info onMore={() => showDetail("Types de messages", `Répartition des messages sur ${periodDescription}.`, [
              ...[["Total", typeCounts?.total], ["Texte", typeCounts?.text], ["Images", typeCounts?.images], ["Vidéos", typeCounts?.videos], ["Vocaux", typeCounts?.voice], ["Fichiers", typeCounts?.files], ["GIF", typeCounts?.gif], ["Liens", typeCounts?.links], ["Autres", typeCounts?.other]].map(([label, value]) => ({ label: String(label), value: number(value as number | null | undefined) })),
            ])} />
            <div className="bp-types-grid">
              <MetricTile icon={BarChart3} label="Total" value={typeCounts?.total} active />
              <MetricTile icon={FileText} label="Texte" value={typeCounts?.text} color="slate" />
              <MetricTile icon={Image} label="Images" value={typeCounts?.images} color="mint" />
              <MetricTile icon={Video} label="Vidéos" value={typeCounts?.videos} color="violet" />
              <MetricTile icon={Mic} label="Vocaux" value={typeCounts?.voice} color="blue" />
              <MetricTile icon={File} label="Fichiers" value={typeCounts?.files} color="amber" />
              <MetricTile icon={Film} label="GIF" value={typeCounts?.gif} color="pink" />
              <MetricTile icon={Link2} label="Liens" value={typeCounts?.links} color="gray" />
            </div>
          </section>

          <section className="bp-section-card bp-recent-card">
            <SectionHeading icon={Clock3} title="Activité récente" onMore={() => showDetail("Activité récente", recent.length ? "Les derniers messages enregistrés dans le groupe." : "Aucune activité enregistrée.", recent.map(item => ({ label: `${item.name} · ${item.type === "system" ? "message système" : "a envoyé un message"}`, value: fmtDate(item.createdAt, stats?.timeZone) })))} />
            {recent.length ? <div className="bp-activity-list">{recent.slice(0, 5).map((activity, index) => <div className="bp-activity-row" key={activity.id}>
              <span className={`bp-avatar bp-avatar-${index % 4}`}>{activity.name.trim().slice(0, 1).toUpperCase()}</span>
              <span className="bp-activity-copy"><strong>{activity.name}</strong><span>{activity.type === "system" ? "a envoyé un message système" : "a envoyé un message"}</span></span>
              <time>{fmtDate(activity.createdAt, stats?.timeZone)}</time>
              <button className="bp-row-menu" type="button" aria-label={`Détails de l’activité de ${activity.name}`} onClick={() => showDetail(activity.name, activity.type === "system" ? "Message système" : "Message envoyé", [{ label: "Date", value: fmtDate(activity.createdAt, stats?.timeZone) }])}><MoreVertical size={15} /></button>
            </div>)}</div> : <div className="bp-activity-empty"><MessageCircle size={18} /><span>Aucune activité enregistrée.</span></div>}
          </section>
          <footer className="bp-demo-caption">{demoMode ? "Démonstration · données fictives pour la comparaison visuelle" : null}</footer>
        </>}

        {tab === "Boosts" && <section className="bp-section-card bp-unavailable-card"><Zap size={24} /><strong>Boosts indisponibles</strong><span>Les boosts ne sont pas encore disponibles pour ce groupe.</span></section>}
      </main>

      {(menuOpen || detail) && <div className="bp-sheet-backdrop" role="presentation" onClick={() => { setMenuOpen(false); setDetail(null); }}>
        <section className="bp-detail-sheet" role="dialog" aria-modal="true" aria-label={detail?.title ?? "Menu du groupe"} onClick={event => event.stopPropagation()}>
          <div className="bp-sheet-grabber" />
          <div className="bp-sheet-title-row"><h2>{detail?.title ?? "Options du groupe"}</h2><button type="button" aria-label="Fermer" onClick={() => { setMenuOpen(false); setDetail(null); }}><X size={20} /></button></div>
          {detail ? <><p className="bp-sheet-description">{detail.description}</p>{detail.rows?.length ? <div className="bp-detail-rows">{detail.rows.map((row, index) => <div key={`${row.label}-${index}`}><span>{row.label}</span><strong>{row.value}</strong></div>)}</div> : null}</> : <div className="bp-menu-options">
            <button type="button" onClick={() => { setMenuOpen(false); showDetail("Informations du groupe", "Statistiques et activité du groupe.", [{ label: "Nom", value: title }, { label: "Membres", value: number(stats?.membersTotal) }]); }}><Users size={18} /> Informations du groupe <ChevronRight size={16} /></button>
            <button type="button" onClick={() => { setMenuOpen(false); onMembers ? onMembers() : showDetail("Membres", "Liste des membres du groupe.", detailRows([["Membres", stats?.membersTotal]])); }}><Users size={18} /> Membres <ChevronRight size={16} /></button>
            <button type="button" onClick={() => { setMenuOpen(false); onModeration ? onModeration() : showDetail("Modération", "Seuls les administrateurs et modérateurs du groupe peuvent accéder à cette section."); }}><Shield size={18} /> Modération <ChevronRight size={16} /></button>
          </div>}
        </section>
      </div>}
    </div>,
    document.body,
  );
}
