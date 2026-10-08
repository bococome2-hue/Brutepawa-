import StatusBar from '../components/StatusBar';
import BottomNav from '../components/BottomNav';

interface Props { onNavigate: (tab: 'accueil' | 'insights' | 'monetisation' | 'profil') => void; }

const menuItems = [
  { icon: '✏️', label: 'Modifier le profil' },
  { icon: '🛡️', label: 'Statut du compte' },
  { icon: '🔒', label: 'Paramètres de confidentialité' },
  { icon: '⚡', label: 'Paramètres Pro' },
  { icon: '❓', label: 'Aide & support' },
];

export default function Screen12({ onNavigate }: Props) {
  return (
    <div className="h-full flex flex-col bg-white">
      <StatusBar />

      <div className="flex-1 overflow-y-auto">
        {/* Profile header */}
        <div className="flex flex-col items-center pt-4 pb-5 px-5">
          {/* Avatar with rings */}
          <div className="relative mb-3">
            <div className="w-4 h-4 rounded-full border-2 border-green-300 absolute -top-1 -right-1 bg-white" />
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-extrabold text-2xl"
              style={{ boxShadow: '0 0 0 3px white, 0 0 0 5px #22C55E' }}>
              PP
            </div>
          </div>

          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[20px] font-extrabold text-gray-900">Pat Pat</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#22C55E"><path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <span className="text-[12px] font-bold text-green-700 bg-green-100 px-3 py-1 rounded-full mb-4">Creator</span>

          {/* Stats */}
          <div className="flex w-full justify-around py-3 border-y border-gray-100">
            <div className="text-center">
              <p className="text-[18px] font-extrabold text-gray-900">345</p>
              <p className="text-[11px] text-gray-400">Publications</p>
            </div>
            <div className="w-px bg-gray-200" />
            <div className="text-center">
              <p className="text-[18px] font-extrabold text-gray-900">12.8K</p>
              <p className="text-[11px] text-gray-400">Abonnés</p>
            </div>
            <div className="w-px bg-gray-200" />
            <div className="text-center">
              <p className="text-[18px] font-extrabold text-gray-900">320</p>
              <p className="text-[11px] text-gray-400">Abonnements</p>
            </div>
          </div>

          {/* Public profile button */}
          <button className="w-full mt-4 py-3 border-2 border-gray-200 rounded-2xl text-[14px] font-bold text-gray-700 flex items-center justify-center gap-1">
            Voir le profil public <span className="text-gray-400">›</span>
          </button>
        </div>

        {/* Menu items */}
        <div className="divide-y divide-gray-100">
          {menuItems.map((item, i) => (
            <button key={i} className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 text-left">
              <span className="text-lg w-8">{item.icon}</span>
              <span className="flex-1 text-[15px] font-medium text-gray-900">{item.label}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2.5"><polyline points="9,18 15,12 9,6"/></svg>
            </button>
          ))}
        </div>
      </div>

      <BottomNav active="profil" onNavigate={onNavigate} />
    </div>
  );
}
