export default function StatusBar({ dark = false }: { dark?: boolean }) {
  const color = dark ? 'text-white' : 'text-gray-900';
  return (
    <div className={`flex items-center justify-between px-5 pt-3 pb-1 text-xs font-semibold ${color} flex-shrink-0`}>
      <span>9:41</span>
      <div className="flex items-center gap-1">
        <svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor">
          <rect x="0" y="4" width="3" height="8" rx="1" opacity="0.4"/>
          <rect x="4" y="2.5" width="3" height="9.5" rx="1" opacity="0.6"/>
          <rect x="8" y="1" width="3" height="11" rx="1" opacity="0.8"/>
          <rect x="12" y="0" width="3" height="12" rx="1"/>
        </svg>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor">
          <path d="M8 2.4C5.6 2.4 3.4 3.4 1.8 5L0 3.2C2.2 1.2 5 0 8 0s5.8 1.2 8 3.2L14.2 5C12.6 3.4 10.4 2.4 8 2.4z" opacity="0.4"/>
          <path d="M8 5.6C6.4 5.6 5 6.2 3.9 7.2L2.1 5.4C3.6 4 5.7 3.2 8 3.2s4.4.8 5.9 2.2L12.1 7.2C11 6.2 9.6 5.6 8 5.6z" opacity="0.7"/>
          <circle cx="8" cy="10" r="2"/>
        </svg>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="currentColor">
          <rect x="0" y="1" width="22" height="10" rx="2" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.35"/>
          <rect x="22.5" y="3.5" width="2" height="5" rx="1" opacity="0.4"/>
          <rect x="1" y="2" width="18" height="8" rx="1.5" opacity="0.9"/>
        </svg>
      </div>
    </div>
  );
}
