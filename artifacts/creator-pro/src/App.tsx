import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import PhoneFrame from './components/PhoneFrame';
import Screen1 from './screens/Screen1';
import Screen2 from './screens/Screen2';
import Screen3 from './screens/Screen3';
import Screen4 from './screens/Screen4';
import Screen5 from './screens/Screen5';
import Screen6 from './screens/Screen6';
import Screen7 from './screens/Screen7';
import Screen8 from './screens/Screen8';
import Screen9 from './screens/Screen9';
import Screen10 from './screens/Screen10';
import Screen11 from './screens/Screen11';
import Screen12 from './screens/Screen12';

type ScreenNum = 1|2|3|4|5|6|7|8|9|10|11|12;
type NavTab = 'accueil' | 'insights' | 'monetisation' | 'profil';

const tabToScreen: Record<NavTab, ScreenNum> = {
  accueil: 9,
  insights: 10,
  monetisation: 11,
  profil: 12,
};

const slideVariants = {
  initial: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
  animate: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
};

const fadeVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export default function App() {
  const [screen, setScreen] = useState<ScreenNum>(1);
  const [direction, setDirection] = useState(1);

  const goTo = (s: ScreenNum, dir = 1) => {
    setDirection(dir);
    setScreen(s);
  };

  const handleNav = (tab: NavTab) => goTo(tabToScreen[tab], 0);

  const isMainApp = screen >= 9;
  const variants = isMainApp ? fadeVariants : slideVariants;
  const transition = isMainApp
    ? { duration: 0.2 }
    : { type: 'spring' as const, stiffness: 300, damping: 30 };

  const screenMap: Record<ScreenNum, JSX.Element> = {
    1:  <Screen1 onNext={() => goTo(2)} />,
    2:  <Screen2 onNext={() => goTo(3)} onBack={() => goTo(1, -1)} />,
    3:  <Screen3 onNext={() => goTo(4)} onBack={() => goTo(2, -1)} />,
    4:  <Screen4 onNext={() => goTo(5)} onBack={() => goTo(3, -1)} />,
    5:  <Screen5 onNext={() => goTo(6)} onBack={() => goTo(4, -1)} />,
    6:  <Screen6 onNext={() => goTo(7)} onBack={() => goTo(5, -1)} />,
    7:  <Screen7 onNext={() => goTo(8)} onBack={() => goTo(6, -1)} />,
    8:  <Screen8 onNext={() => goTo(9)} onBack={() => goTo(7, -1)} />,
    9:  <Screen9  onNavigate={handleNav} />,
    10: <Screen10 onNavigate={handleNav} />,
    11: <Screen11 onNavigate={handleNav} />,
    12: <Screen12 onNavigate={handleNav} />,
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-300 p-6"
      style={{ background: 'linear-gradient(135deg, #1e3a2f 0%, #166534 50%, #1e3a2f 100%)' }}>
      {/* Title */}
      <div className="mb-6 text-center">
        <div className="flex items-center gap-2 justify-center mb-1">
          <div className="w-8 h-8 rounded-xl bg-green-500 flex items-center justify-center">
            <span className="text-white font-extrabold italic text-sm">b</span>
          </div>
          <span className="text-white font-extrabold text-lg tracking-wide">BrutePawa</span>
        </div>
        <p className="text-green-300 text-xs font-medium">Mode Creator — Maquette interactive</p>
      </div>

      <PhoneFrame>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={screen}
            custom={direction}
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={transition}
            className="absolute inset-0"
          >
            {screenMap[screen]}
          </motion.div>
        </AnimatePresence>
      </PhoneFrame>

      {/* Screen nav dots */}
      <div className="mt-6 flex items-center gap-1.5">
        {(Array.from({ length: 12 }, (_, i) => i + 1) as ScreenNum[]).map(n => (
          <button
            key={n}
            onClick={() => goTo(n, n > screen ? 1 : -1)}
            className={`rounded-full transition-all ${
              screen === n
                ? 'w-5 h-2 bg-green-400'
                : 'w-2 h-2 bg-white/30 hover:bg-white/50'
            }`}
          />
        ))}
      </div>
      <p className="mt-2 text-green-300/60 text-[11px]">Écran {screen}/12</p>
    </div>
  );
}
