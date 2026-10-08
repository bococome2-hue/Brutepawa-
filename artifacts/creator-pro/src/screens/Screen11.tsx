import StatusBar from '../components/StatusBar';
import BottomNav from '../components/BottomNav';

interface Props { onNavigate: (tab: 'accueil' | 'insights' | 'monetisation' | 'profil') => void; }

const tools = [
  { bg: 'bg-yellow-100', icon: '⭐', title: 'Étoiles', status: 'Actif', active: true },
  { bg: 'bg-red-100', icon: '❤️', title: 'Abonnements', status: 'Non actif', active: false },
  { bg: 'bg-blue-100', icon: '🎬', title: 'Publicités in-stream', status: 'Non éligible', active: false },
  { bg: 'bg-purple-100', icon: '🎁', title: 'Cadeaux Live', status: 'Actif', active: true },
];

export default function Screen11({ onNavigate }: Props) {
  return (
    <div className="h-full flex flex-col bg-white">
      <StatusBar />
      {/* Header */}
      <div className="flex items-center justify-between px-5 pb-1">
        <button className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
        </button>
        <h1 className="text-[18px] font-extrabold text-gray-900">Monétisation</h1>
        <button className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </button>
      </div>

      <div className="flex-1 px-5 overflow-y-auto">
        {/* Revenue overview */}
        <p className="text-[15px] font-bold text-gray-900 mt-3 mb-2">Aperçu</p>
        <div className="bg-gray-50 rounded-2xl p-4 mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] text-gray-400 font-medium mb-1">Revenus estimés</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[20px] font-extrabold text-gray-900">240,45 €</span>
              </div>
              <span className="text-[11px] font-bold text-green-500 bg-green-100 px-2 py-0.5 rounded-full">+10%</span>
            </div>
            <div className="border-l border-gray-200 pl-4">
              <p className="text-[11px] text-gray-400 font-medium mb-1">Solde disponible</p>
              <p className="text-[20px] font-extrabold text-gray-900">120,00 €</p>
              <button className="text-[12px] font-bold text-green-600 mt-0.5">Retirer</button>
            </div>
          </div>
        </div>

        {/* Tools */}
        <p className="text-[15px] font-bold text-gray-900 mb-2">Outils de monétisation</p>
        <div className="rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-100">
          {tools.map((t, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-xl ${t.bg}`}>{t.icon}</div>
              <p className="flex-1 text-[14px] font-bold text-gray-900">{t.title}</p>
              <div className="flex items-center gap-1">
                {t.active && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#22C55E"><path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                )}
                <span className={`text-[12px] font-semibold ${t.active ? 'text-green-500' : 'text-gray-400'}`}>
                  {t.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomNav active="monetisation" onNavigate={onNavigate} />
    </div>
  );
}
