import StatusBar from '../components/StatusBar';

interface Props { onNext: () => void; onBack: () => void; }

export default function Screen2({ onNext, onBack }: Props) {
  return (
    <div className="h-full flex flex-col bg-white">
      <StatusBar />
      {/* Header */}
      <div className="flex items-center px-5 pb-2">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
        </button>
      </div>

      {/* Crown illustration */}
      <div className="flex flex-col items-center px-6 pt-2 pb-4">
        <div className="relative flex items-center justify-center mb-4">
          {/* Sparkles */}
          <div className="absolute -top-2 -left-4 text-yellow-400 text-xl animate-pulse">✦</div>
          <div className="absolute -top-1 right-0 text-green-400 text-sm">✦</div>
          <div className="absolute bottom-0 -right-5 text-yellow-300 text-lg">✦</div>
          {/* Crown */}
          <div className="relative">
            <div className="w-32 h-32 rounded-3xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#22C55E,#16A34A)', boxShadow: '0 16px 40px rgba(34,197,94,0.4)' }}>
              <CrownSVG />
            </div>
            {/* Logo b overlay */}
            <div className="absolute -bottom-3 -right-3 w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-lg border border-gray-100">
              <span className="text-green-600 font-extrabold text-xl italic">b</span>
            </div>
          </div>
        </div>

        <h1 className="text-[24px] font-extrabold text-center mb-1"
          style={{ background: 'linear-gradient(135deg,#22C55E,#16A34A)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Bienvenue Creator !
        </h1>
        <p className="text-[13px] text-gray-500 text-center leading-relaxed mb-4">
          Vous avez accès à des outils exclusifs pour développer votre présence et atteindre vos objectifs.
        </p>

        <p className="text-[14px] font-bold text-green-600 self-start mb-3">Vous allez pouvoir :</p>
        <div className="w-full space-y-3">
          {['Définir votre audience', 'Monétiser votre contenu', 'Accéder à des outils pro', 'Développer votre marque'].map(t => (
            <div key={t} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20,6 9,17 4,12"/></svg>
              </div>
              <span className="text-[14px] font-medium text-gray-700">{t}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1" />
      {/* Footer */}
      <div className="px-5 pb-6 pt-3 flex-shrink-0 space-y-2">
        <button onClick={onNext} className="w-full py-4 rounded-2xl text-white font-bold text-[15px]"
          style={{ background: 'linear-gradient(135deg,#22C55E,#16A34A)', boxShadow: '0 6px 20px rgba(34,197,94,.35)' }}>
          Suivant
        </button>
        <p className="text-[11px] text-gray-400 text-center">2/12</p>
      </div>
    </div>
  );
}

function CrownSVG() {
  return (
    <svg width="64" height="56" viewBox="0 0 64 56" fill="none">
      <path d="M4 44L12 20L24 36L32 8L40 36L52 20L60 44H4Z" fill="white" opacity="0.95"/>
      <path d="M2 44H62V52H2Z" fill="white" opacity="0.9" rx="4"/>
      <circle cx="4" cy="20" r="4" fill="#DCFCE7"/>
      <circle cx="32" cy="8" r="4" fill="#DCFCE7"/>
      <circle cx="60" cy="20" r="4" fill="#DCFCE7"/>
    </svg>
  );
}
