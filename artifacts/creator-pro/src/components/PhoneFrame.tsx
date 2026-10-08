import { ReactNode } from 'react';

export default function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex-shrink-0 w-[390px] h-[844px] bg-gray-900 rounded-[44px] shadow-2xl overflow-hidden"
      style={{ boxShadow: '0 40px 80px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.1)' }}>
      <div className="absolute inset-[3px] rounded-[41px] bg-white overflow-hidden">
        {children}
      </div>
    </div>
  );
}
