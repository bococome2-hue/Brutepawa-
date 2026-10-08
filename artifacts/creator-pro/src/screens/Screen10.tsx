import { useState } from 'react';
import StatusBar from '../components/StatusBar';
import BottomNav from '../components/BottomNav';
import MiniChart from '../components/MiniChart';

interface Props { onNavigate: (tab: 'accueil' | 'insights' | 'monetisation' | 'profil') => void; }

type Tab = 'overview' | 'content' | 'audience' | 'revenus';

const revenueData = [20, 35, 28, 42, 38, 55, 48, 65, 58, 72, 68, 80, 75, 88];
const engagementData = [40, 55, 48, 62, 58, 70, 65, 78, 72, 85, 80, 88, 84, 92];

export default function Screen10({ onNavigate }: Props) {
  const [tab, setTab] = useState<Tab>('overview');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Vue d\'ensemble' },
    { id: 'content', label: 'Contenu' },
    { id: 'audience', label: 'Audience' },
    { id: 'revenus', label: 'Revenus' },
  ];

  return (
    <div className="h-full flex flex-col bg-white">
      <StatusBar />
      {/* Header */}
      <div className="flex items-center justify-between px-5 pb-1">
        <h1 className="text-[18px] font-extrabold text-gray-900">Insights</h1>
        <button className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex px-5 gap-5 border-b border-gray-100 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`pb-2.5 text-[13px] font-semibold flex-shrink-0 border-b-2 transition-colors ${tab === t.id ? 'text-gray-900 border-green-500' : 'text-gray-400 border-transparent'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 px-5 pt-4 overflow-y-auto">
        <p className="text-[15px] font-bold text-gray-900 mb-3">Aperçu</p>

        {/* Revenue metric card */}
        <div className="rounded-2xl border border-gray-100 p-4 mb-3">
          <p className="text-[12px] text-gray-400 font-medium mb-1">Revenus estimés</p>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-[22px] font-extrabold text-gray-900">125,456</span>
            <span className="text-[12px] font-bold text-green-500 bg-green-100 px-2 py-0.5 rounded-full">+32%</span>
          </div>
          <MiniChart data={revenueData} id="s10r" height={55} />
        </div>

        {/* Engagement metric card */}
        <div className="rounded-2xl border border-gray-100 p-4">
          <p className="text-[12px] text-gray-400 font-medium mb-1">Engagement</p>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-[22px] font-extrabold text-gray-900">8,764</span>
            <span className="text-[12px] font-bold text-green-500 bg-green-100 px-2 py-0.5 rounded-full">+16%</span>
          </div>
          <MiniChart data={engagementData} id="s10e" height={55} />
        </div>
      </div>

      <BottomNav active="insights" onNavigate={onNavigate} />
    </div>
  );
}
