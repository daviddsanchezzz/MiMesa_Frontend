import { createContext, useContext, useState, useEffect } from 'react';

const MobileHeaderContext = createContext({
  title: null,
  actions: null,
  setTitle: () => {},
  setActions: () => {},
});

export function MobileHeaderProvider({ children }) {
  const [title, setTitle] = useState(null);
  const [actions, setActions] = useState(null);
  return (
    <MobileHeaderContext.Provider value={{ title, setTitle, actions, setActions }}>
      {children}
    </MobileHeaderContext.Provider>
  );
}

export function useMobileHeader() {
  return useContext(MobileHeaderContext);
}

export function useSetMobileHeader({ title, actions }) {
  const { setTitle, setActions } = useMobileHeader();
  useEffect(() => {
    if (title !== undefined) setTitle(title);
    if (actions !== undefined) setActions(actions);
    return () => {
      setTitle(null);
      setActions(null);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, actions]);
}
