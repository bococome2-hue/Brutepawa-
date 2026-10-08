import StatusBar from '../components/StatusBar';

interface Props { onNext: () => void; onBack: () => void; }

const tools = [
  {
    bg: 'bg-yellow-100',
    icon: <span className="text-xl">⭐</span>,
    title: 'Étoiles',
    desc: 'Recevez des étoiles et des cadeaux de vos fans.',
  },
  {
    bg: 'bg-red-100',
    icon: <span className="text-xl">❤️</span>,
    title: 'Abonnements',
    desc: 'Accédez au contenu exclusif de vos abonnés.',
  },
  {
    bg: 'bg-blue-100',
    icon: <span className="text-xl">🎬</span>,
    title: 'Publicités in-stream',
    desc: 'Gagnez de l\'argent grâce aux publicités sur vos vidéos.',
  },
];

export default function Screen5({ onNext, onBack }: Props) {
  return (
    <div className="h-full flex flex-col bg-white">
      <StatusBar dark />
      {/* Green header */}
      <div className="px-5 py-5 flex-shrink-0"
        style={{ background: 'linear-gradient(135deg,#16A34A,#22C55E)' }}>
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center mb-4">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
        </button>
        <h1 className="text-[20px] font-extrabold text-white leading-tight mb-1">
          Commencez à gagner de l'argent dès aujourd'hui
        </h1>
        <p className="text-[13px] text-white/80 mb-3">Votre profil est presque éligible à la monétisation.</p>
        <button className="border-2 border-white/80 text-white text-[13px] font-bold px-4 py-2 rounded-xl">
          Voir l'éligibilité
        </button>
      </div>

      <div className="flex-1 px-5 pt-4 overflow-y-auto">
        <p className="text-[15px] font-bold text-gray-900 mb-3">Outils disponibles</p>
        <div className="space-y-1">
          {tools.map((t, i) => (
            <div key={i} className="flex items-center gap-3 py-3.5 border-b border-gray-100 last:border-0">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${t.bg}`}>{t.icon}</div>
              <div className="flex-1">
                <p className="text-[15px] font-bold text-gray-900">{t.title}</p>
                <p className="text-[12px] text-gray-400">{t.desc}</p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2.5"><polyline points="9,18 15,12 9,6"/></svg>
            </div>
          ))}
        </div>
        <button className="mt-3 text-[13px] font-semibold text-green-600">
          En savoir plus sur la monétisation ›
        </button>
      </div>

      <div className="px-5 pb-6 pt-3 flex-shrink-0 space-y-2">
        <button onClick={onNext} className="w-full py-4 rounded-2xl text-white font-bold text-[15px]"
          style={{ background: 'linear-gradient(135deg,#22C55E,#16A34A)', boxShadow: '0 6px 20px rgba(34,197,94,.35)' }}>
          Suivant
        </button>
        <p className="text-[11px] text-gray-400 text-center">5/12</p>
      </div>
    </div>
  );
}
