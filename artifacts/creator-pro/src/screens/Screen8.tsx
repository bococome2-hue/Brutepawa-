import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StatusBar from '../components/StatusBar';

interface Props { onNext: () => void; onBack: () => void; }

type Rating = 'tres-satisfait' | 'satisfait' | 'neutre' | 'insatisfait' | 'tres-insatisfait';

const ratings: { id: Rating; emoji: string; label: string }[] = [
  { id: 'tres-satisfait', emoji: '😄', label: 'Très satisfait' },
  { id: 'satisfait', emoji: '🙂', label: 'Légèrement satisfait' },
  { id: 'neutre', emoji: '😐', label: 'Neutre' },
  { id: 'insatisfait', emoji: '😕', label: 'Légèrement insatisfait' },
  { id: 'tres-insatisfait', emoji: '😞', label: 'Très insatisfait' },
];

export default function Screen8({ onNext, onBack }: Props) {
  const [selected, setSelected] = useState<Rating>('tres-satisfait');

  return (
    <div className="h-full flex flex-col bg-white relative overflow-hidden">
      {/* Blurred background (same as Screen7) */}
      <div className="absolute inset-0 bg-white">
        <div className="opacity-40">
          <div className="pt-12 px-5">
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-extrabold ring-2 ring-green-400">PP</div>
              <div>
                <p className="text-[16px] font-bold">Pat Pat ✓</p>
                <p className="text-[12px] text-gray-400">Creator depuis Décembre 2024</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/55" />

      {/* Modal - bottom sheet style */}
      <div className="absolute inset-0 flex flex-col justify-end">
        <AnimatePresence>
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="bg-white rounded-t-3xl px-5 pt-4 pb-8"
          >
            {/* Drag indicator */}
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />

            <h2 className="text-[17px] font-bold text-gray-900 mb-1">Donnez votre avis</h2>
            <p className="text-[13px] text-gray-500 mb-4 leading-relaxed">
              Dans quelle mesure êtes-vous satisfait de l'aide reçue jusqu'à présent ?
            </p>

            <div className="space-y-0.5 mb-5">
              {ratings.map(r => {
                const active = selected === r.id;
                return (
                  <button key={r.id} onClick={() => setSelected(r.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-colors text-left ${active ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                    <span className="text-2xl flex-shrink-0">{r.emoji}</span>
                    <span className={`flex-1 text-[15px] font-medium ${active ? 'text-gray-900' : 'text-gray-700'}`}>{r.label}</span>
                    <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${active ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}>
                      {active && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <button onClick={onNext} className="w-full py-4 rounded-2xl text-white font-bold text-[15px]"
              style={{ background: 'linear-gradient(135deg,#22C55E,#16A34A)', boxShadow: '0 6px 20px rgba(34,197,94,.35)' }}>
              Continuer
            </button>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Status bar on top */}
      <div className="relative z-10">
        <StatusBar dark />
        <div className="flex items-center px-5 pb-2">
          <button onClick={onBack} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="15,18 9,12 15,6"/></svg>
          </button>
          <h1 className="flex-1 text-center text-[17px] font-bold text-white -ml-9">Statut du profil</h1>
        </div>
      </div>
    </div>
  );
}
