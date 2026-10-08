type Tab = 'accueil' | 'insights' | 'monetisation' | 'profil';

interface Props {
  active: Tab;
  onNavigate: (t: Tab) => void;
}

export default function BottomNav({ active, onNavigate }: Props) {
  const item = (label: string, tab: Tab, icon: JSX.Element) => {
    const isActive = active === tab;
    return (
      <button
        key={tab}
        onClick={() => onNavigate(tab)}
        className="flex flex-col items-center gap-0.5 flex-1"
      >
        <span className={isActive ? 'text-green-500' : 'text-gray-400'}>{icon}</span>
        <span className={`text-[10px] font-semibold ${isActive ? 'text-green-500' : 'text-gray-400'}`}>
          {label}
        </span>
      </button>
    );
  };

  return (
    <div className="flex-shrink-0 flex items-center bg-white border-t border-gray-100 px-2 py-2"
      style={{ boxShadow: '0 -4px 12px rgba(0,0,0,0.04)' }}>
      {item('Accueil', 'accueil', <HomeIcon />)}
      {item('Insights', 'insights', <InsightsIcon />)}
      {/* FAB */}
      <div className="flex flex-col items-center flex-1">
        <div className="w-12 h-12 rounded-full flex items-center justify-center -mt-5"
          style={{ background: 'linear-gradient(135deg,#22C55E,#16A34A)', boxShadow: '0 4px 14px rgba(34,197,94,0.4)' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </div>
      </div>
      {item('Monétisation', 'monetisation', <MoneyIcon />)}
      {item('Profil', 'profil', <ProfileIcon />)}
    </div>
  );
}

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/>
    </svg>
  );
}
function InsightsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
    </svg>
  );
}
function MoneyIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
    </svg>
  );
}
function ProfileIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  );
}
