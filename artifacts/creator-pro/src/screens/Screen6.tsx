import StatusBar from '../components/StatusBar';
import MiniChart from '../components/MiniChart';

interface Props { onNext: () => void; onBack: () => void; }

const chartData = [38, 45, 40, 52, 48, 60, 55, 70, 65, 80, 75, 90, 85, 95];

const stats = [
  { label: 'Portée', val: '125.4K', pct: '+32%' },
  { label: 'Engagement', val: '8.7K', pct: '+16%' },
  { label: 'Nvx abonnés', val: '1.2K', pct: '+28%' },
  { label: 'Vues vidéos', val: '45.3K', pct: '+41%' },
];

const proTools = [
  { bg: 'bg-green-100', icon: <span className="text-lg">📊</span>, title: 'Tableau de bord', desc: 'Voir toutes vos statistiques' },
  { bg: 'bg-blue-100', icon: <span className="text-lg">✏️</span>, title: 'Création de contenu', desc: 'Outils et ressources' },
  { bg: 'bg-purple-100', icon: <span className="text-lg">📈</span>, title: 'Croissance', desc: 'Développez votre audience' },
  { bg: 'bg-orange-100', icon: <span className="text-lg">💬</span>, title: 'Interaction', desc: 'Gérez vos commentaires' },
];

export default function Screen6({ onNext, onBack }: Props) {
  return (
    <div className="h-full flex flex-col bg-white">
      <StatusBar />
      <div className="flex items-center px-5 pb-1">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
        </button>
        <h1 className="flex-1 text-center text-[17px] font-bold text-gray-900 -ml-9">Outils professionnels</h1>
      </div>

      <div className="flex-1 px-5 overflow-y-auto">
        {/* Performance section */}
        <div className="flex items-center justify-between mt-3 mb-3">
          <p className="text-[15px] font-bold text-gray-900">Performance globale</p>
          <button className="flex items-center gap-1 text-[12px] text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
            7 derniers jours <span className="text-[10px]">▼</span>
          </button>
        </div>

        {/* Stats grid 2x2 */}
        <div className="grid grid-cols-2 gap-2.5 mb-3">
          {stats.map(s => (
            <div key={s.label} className="bg-gray-50 rounded-2xl p-3">
              <p className="text-[11px] text-gray-400 font-medium mb-1">{s.label}</p>
              <p className="text-[20px] font-extrabold text-gray-900 leading-none">{s.val}</p>
              <p className="text-[11px] font-bold text-green-500 mt-0.5">{s.pct} ↑</p>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="rounded-2xl border border-gray-100 p-3 mb-4">
          <MiniChart data={chartData} id="s6" height={80} />
        </div>

        {/* Tools */}
        <p className="text-[15px] font-bold text-gray-900 mb-2">Découvrez vos outils</p>
        <div className="space-y-1">
          {proTools.map((t, i) => (
            <div key={i} className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${t.bg}`}>{t.icon}</div>
              <div className="flex-1">
                <p className="text-[14px] font-bold text-gray-900">{t.title}</p>
                <p className="text-[12px] text-gray-400">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 pb-6 pt-3 flex-shrink-0 space-y-2">
        <button onClick={onNext} className="w-full py-4 rounded-2xl text-white font-bold text-[15px]"
          style={{ background: 'linear-gradient(135deg,#22C55E,#16A34A)', boxShadow: '0 6px 20px rgba(34,197,94,.35)' }}>
          Suivant
        </button>
        <p className="text-[11px] text-gray-400 text-center">6/12</p>
      </div>
    </div>
  );
}
