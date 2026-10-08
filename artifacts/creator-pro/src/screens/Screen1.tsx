import StatusBar from '../components/StatusBar';

interface Props { onNext: () => void; }

export default function Screen1({ onNext }: Props) {
  return (
    <div className="h-full flex flex-col bg-white">
      <StatusBar />
      {/* Header */}
      <div className="flex items-center justify-between px-5 pb-2">
        <div className="w-9 h-9" />
        <span className="text-xs font-bold text-green-700 bg-green-100 px-3 py-1 rounded-full">Mode payant</span>
      </div>
      {/* Avatar */}
      <div className="flex justify-center pt-1 pb-3">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-extrabold text-2xl ring-2 ring-green-400">
            PP
          </div>
          <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </div>
        </div>
      </div>
      {/* Content */}
      <div className="flex-1 px-5 overflow-y-auto">
        <h1 className="text-[22px] font-extrabold text-gray-900 mb-2">Activez le mode pro</h1>
        <p className="text-[13px] text-gray-500 leading-relaxed mb-5">
          Débloquez des outils puissants pour développer votre audience et monétiser votre contenu sur BrutePawa.
        </p>
        {/* Features */}
        <div className="space-y-4">
          <FeatureRow
            bg="bg-green-100"
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 17V13M12 17V9M16 17V12"/></svg>}
            title="Statistiques avancées"
            desc="Analysez vos performances et comprenez mieux votre audience."
          />
          <FeatureRow
            bg="bg-blue-100"
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>}
            title="Élargissez votre audience"
            desc="Rendez votre contenu public pour toucher des millions de personnes."
          />
          <FeatureRow
            bg="bg-orange-100"
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>}
            title="Gagnez de l'argent"
            desc="Accédez aux outils de monétisation et commencez à générer des revenus."
          />
        </div>
      </div>
      {/* Footer */}
      <div className="px-5 pb-4 pt-3 space-y-2 flex-shrink-0">
        <button onClick={onNext} className="w-full py-4 rounded-2xl text-white font-bold text-[15px] shadow-lg"
          style={{ background: 'linear-gradient(135deg,#22C55E,#16A34A)', boxShadow: '0 6px 20px rgba(34,197,94,.35)' }}>
          Activer le mode pro
        </button>
        <button className="w-full py-2 text-[14px] font-semibold text-gray-400 flex items-center justify-center gap-1">
          En savoir plus <span className="text-base">›</span>
        </button>
        <p className="text-[11px] text-gray-400 text-center leading-tight">
          En activant, vous acceptez les <span className="text-green-600 font-semibold">Conditions commerciales</span> de BrutePawa.
        </p>
        <p className="text-[11px] text-gray-400 text-center">1/12</p>
      </div>
    </div>
  );
}

function FeatureRow({ bg, icon, title, desc }: { bg: string; icon: JSX.Element; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>{icon}</div>
      <div>
        <p className="text-[15px] font-bold text-gray-900">{title}</p>
        <p className="text-[12px] text-gray-400 leading-snug">{desc}</p>
      </div>
    </div>
  );
}
