import StatusBar from '../components/StatusBar';

interface Props { onNext: () => void; onBack: () => void; }

export default function Screen7({ onNext, onBack }: Props) {
  return (
    <div className="h-full flex flex-col bg-white">
      <StatusBar />
      <div className="flex items-center px-5 pb-1">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
        </button>
        <h1 className="flex-1 text-center text-[17px] font-bold text-gray-900 -ml-9">Statut du profil</h1>
      </div>

      <div className="flex-1 px-5 overflow-y-auto">
        {/* Profile card */}
        <div className="flex items-center gap-3 mt-3 mb-4 p-4 bg-gray-50 rounded-2xl">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-extrabold text-lg ring-2 ring-green-400">
            PP
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-[16px] font-bold text-gray-900">Pat Pat</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#22C55E"><path d="M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <p className="text-[12px] text-gray-400">Creator depuis Mai 2024</p>
          </div>
        </div>

        {/* Quality */}
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Qualité du compte</p>
        <div className="p-4 bg-gray-50 rounded-2xl mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[16px] font-bold text-green-500">Excellent</span>
            <span className="text-[16px] font-bold text-gray-900">100 / 100</span>
          </div>
          <div className="h-2 bg-green-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full" style={{ width: '100%' }} />
          </div>
        </div>

        {/* Fonctionnalités */}
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Fonctionnalités</p>
        <div className="rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-100 mb-4">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="w-9 h-9 rounded-xl bg-yellow-100 flex items-center justify-center flex-shrink-0">
              <span className="text-base">⭐</span>
            </div>
            <p className="flex-1 text-[14px] font-bold text-gray-900">Recommandations</p>
            <span className="text-[12px] font-bold text-green-500">Actif</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2.5"><polyline points="9,18 15,12 9,6"/></svg>
          </div>
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <p className="flex-1 text-[14px] font-bold text-gray-900">Monétisation</p>
            <span className="text-[12px] font-bold text-red-400">Non éligible</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2.5"><polyline points="9,18 15,12 9,6"/></svg>
          </div>
        </div>

        {/* Ressources */}
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Ressources utiles</p>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-gray-50 rounded-2xl p-4 text-center">
            <span className="text-2xl mb-2 block">📋</span>
            <p className="text-[12px] font-semibold text-gray-700 leading-snug">Standards de la communauté</p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4 text-center">
            <span className="text-2xl mb-2 block">💡</span>
            <p className="text-[12px] font-semibold text-gray-700 leading-snug">Conseils pour les créateurs</p>
          </div>
        </div>
      </div>

      <div className="px-5 pb-6 pt-3 flex-shrink-0 space-y-2">
        <button onClick={onNext} className="w-full py-4 rounded-2xl text-white font-bold text-[15px]"
          style={{ background: 'linear-gradient(135deg,#22C55E,#16A34A)', boxShadow: '0 6px 20px rgba(34,197,94,.35)' }}>
          Suivant
        </button>
        <p className="text-[11px] text-gray-400 text-center">7/12</p>
      </div>
    </div>
  );
}
