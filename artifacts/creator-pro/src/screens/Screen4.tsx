import StatusBar from '../components/StatusBar';

interface Props { onNext: () => void; onBack: () => void; }

const settings = [
  { icon: '👁', q: 'Qui peut voir vos reels, stories et publications ?', val: '' },
  { icon: '🔄', q: 'Autorisez d\'autres personnes à partager vos stories et reels ?', val: 'Activé' },
  { icon: '💬', q: 'Qui peut commenter vos publications publiques ?', val: 'Public' },
  { icon: 'ℹ️', q: 'Informations de profil publiques', val: 'Public' },
  { icon: '👥', q: 'Qui peut voir les personnes et Pages que vous suivez ?', val: '' },
  { icon: '🔍', q: 'Autorisez les moteurs de recherche à vous recommander ?', val: 'Activé' },
];

export default function Screen4({ onNext, onBack }: Props) {
  return (
    <div className="h-full flex flex-col bg-white">
      <StatusBar />
      <div className="flex items-center px-5 pb-2">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
        </button>
      </div>

      <div className="flex-1 px-5 overflow-y-auto">
        <h1 className="text-[22px] font-extrabold text-gray-900 mb-1">Examiner la sélection</h1>
        <p className="text-[13px] text-gray-500 mb-4 leading-relaxed">
          Nous suggérons ces paramètres aux Creators qui veulent élargir leur audience.
        </p>

        <div className="rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-100">
          {settings.map((s, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 text-base">
                {s.icon}
              </div>
              <p className="flex-1 text-[13px] text-gray-700 leading-snug">{s.q}</p>
              <div className="flex items-center gap-1 flex-shrink-0">
                {s.val && (
                  <span className={`text-[12px] font-semibold ${s.val === 'Activé' ? 'text-green-600' : 'text-gray-500'}`}>
                    {s.val}
                  </span>
                )}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2.5"><polyline points="9,18 15,12 9,6"/></svg>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 pb-6 pt-3 flex-shrink-0 space-y-2">
        <button onClick={onNext} className="w-full py-4 rounded-2xl text-white font-bold text-[15px]"
          style={{ background: 'linear-gradient(135deg,#22C55E,#16A34A)', boxShadow: '0 6px 20px rgba(34,197,94,.35)' }}>
          Confirmer
        </button>
        <button className="w-full py-2 text-[14px] font-semibold text-gray-400 flex items-center justify-center gap-1">
          Modifier les paramètres <span className="text-base">›</span>
        </button>
        <p className="text-[11px] text-gray-400 text-center">4/12</p>
      </div>
    </div>
  );
}
