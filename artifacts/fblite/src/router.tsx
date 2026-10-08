import { createContext, useContext, useState, useEffect, ReactNode, JSX } from "react";

interface RouterCtx {
  path: string;
  navigate: (to: string | number) => void;
}

const RouterContext = createContext<RouterCtx>({ path: "/", navigate: () => {} });

export function Router({ children }: { children: ReactNode }) {
  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const getPath = () => {
    const full = window.location.pathname;
    return full.startsWith(base) ? full.slice(base.length) || "/" : full;
  };

  const [path, setPath] = useState(getPath);

  useEffect(() => {
    const handler = () => setPath(getPath());
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  const navigate = (to: string | number) => {
    if (typeof to === "number") {
      window.history.go(to);
      return;
    }
    const url = base + to;
    window.history.pushState(null, "", url);
    setPath(to);
    window.dispatchEvent(new Event("bp:navigate"));
  };

  return <RouterContext.Provider value={{ path, navigate }}>{children}</RouterContext.Provider>;
}

export function useNavigate() {
  return useContext(RouterContext).navigate;
}

export function useLocation() {
  return useContext(RouterContext).path;
}

export function Route({ path, component: Component }: { path: string; component: () => JSX.Element }) {
  const { path: current } = useContext(RouterContext);
  if (current === path) return <Component />;
  return null;
}
