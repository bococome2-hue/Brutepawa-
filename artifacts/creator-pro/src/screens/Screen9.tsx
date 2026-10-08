import StatusBar from '../components/StatusBar';
import BottomNav from '../components/BottomNav';
import MiniChart from '../components/MiniChart';

interface Props { onNavigate: (tab: 'accueil' | 'insights' | 'monetisation' | 'profil') => void; }

const chartData = [30, 45, 38, 55, 50, 68, 62, 78, 70, 85, 80, 95, 88, 100];
const stats3 = [
  { label: 'Portée', val: '125.4K', pct: '+32%' },
  { label: 'Engagement', val: '8.7K', pct: '+26%' },
  { label: 'Vues vidéos', val: '45.3K', pct: '+41%' },
];

export default function Screen9({ onNavigate }: Props) {
  return (
    <div className="h-full flex flex-col bg-white">
      <StatusBar />
      {/* Header */}
      <div className="flex items-center justify-between px-5 pb-1">
        <h1 className="text-[18px] font-extrabold text-gray-900">Tableau de bord</h1>
        <button className="flex items-center gap-1 text-[12px] text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
          7 derniers jours <span className="text-[10px]">▼</span>
        </button>
      </div>

      <div className="flex-1 px-5 overflow-y-auto">
        {/* Aperçu */}
        <div className="flex items-center justify-between mt-3 mb-2">
          <p className="text-[15px] font-bold text-gray-900">Aperçu</p>
          <button className="text-[12px] font-semibold text-green-600">Voir tout ›</button>
        </div>

        {/* Stats 3 cols */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {stats3.map(s => (
            <div key={s.label} className="bg-gray-50 rounded-2xl p-3">
              <p className="text-[10px] text-gray-400 font-medium mb-1 leading-tight">{s.label}</p>
              <p className="text-[15px] font-extrabold text-gray-900 leading-none">{s.val}</p>
              <p className="text-[10px] font-bold text-green-500 mt-0.5">{s.pct}</p>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="rounded-2xl border border-gray-100 p-3 mb-4">
          <MiniChart data={chartData} id="s9" height={80} />
        </div>

        {/* Revenus */}
        <div className="bg-gray-50 rounded-2xl p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[13px] text-gray-400 font-medium mb-1">Revenus estimés</p>
              <div className="flex items-baseline gap-2">
                <span className="text-[26px] font-extrabold text-gray-900">240,45 €</span>
                <span className="text-[13px] font-bold text-green-500 bg-green-100 px-2 py-0.5 rounded-full">+15%</span>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">vs 7 jours précédents</p>
            </div>
            <button className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </button>
          </div>
        </div>
      </div>

      <BottomNav active="insights" onNavigate={onNavigate} />
    </div>
  );
}
