import { useState } from 'react';
import StatusBar from '../components/StatusBar';

interface Props { onNext: () => void; onBack: () => void; }

type Audience = 'public' | 'amis' | 'perso';

export default function Screen3({ onNext, onBack }: Props) {
  const [selected, setSelected] = useState<Audience>('public');

  const options: { id: Audience; icon: JSX.Element; bg: string; title: string; desc: string }[] = [
    {
      id: 'public',
      bg: 'bg-green-100',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/></svg>,
      title: 'Public · Suggestions',
      desc: 'Tout le monde peut voir votre contenu et être suggéré.',
    },
    {
      id: 'amis',
      bg: 'bg-blue-100',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
      title: 'Ami(e)s',
      desc: 'Seules vos ami(e)s peuvent voir votre contenu.',
    },
    {
      id: 'perso',
      bg: 'bg-purple-100',
      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
      title: 'Personnalisée',
      desc: 'Choisissez manuellement qui peut voir votre contenu.',
    },
  ];

  return (
    <div className="h-full flex flex-col bg-white">
      <StatusBar />
      <div className="flex items-center px-5 pb-2">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
        </button>
      </div>

      <div className="flex-1 px-5 overflow-y-auto">
        <h1 className="text-[22px] font-extrabold text-gray-900 mb-1">Audience par défaut</h1>
        <p className="text-[13px] text-gray-500 mb-5 leading-relaxed">
          Choisissez l'audience qui verra automatiquement vos publications, stories et reels.
        </p>

        <div className="space-y-3">
          {options.map(opt => {
            const active = selected === opt.id;
            return (
              <button key={opt.id} onClick={() => setSelected(opt.id)}
                className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${active ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${opt.bg}`}>{opt.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[15px] font-bold ${active ? 'text-gray-900' : 'text-gray-900'}`}>{opt.title}</p>
                    <p className="text-[12px] text-gray-400 leading-snug">{opt.desc}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${active ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}>
                    {active && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <button className="mt-4 text-[13px] font-semibold text-green-600">Comment choisir ?</button>
      </div>

      <div className="px-5 pb-6 pt-3 flex-shrink-0 space-y-2">
        <button onClick={onNext} className="w-full py-4 rounded-2xl text-white font-bold text-[15px]"
          style={{ background: 'linear-gradient(135deg,#22C55E,#16A34A)', boxShadow: '0 6px 20px rgba(34,197,94,.35)' }}>
          Suivant
        </button>
        <p className="text-[11px] text-gray-400 text-center">3/12</p>
      </div>
    </div>
  );
}
