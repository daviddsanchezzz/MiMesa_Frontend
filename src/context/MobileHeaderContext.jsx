import { createContext, useContext, useState, useEffect, useRef } from 'react';

// The phone header (below xl) shows the page title and its main action, so
// pages hide their own title and main button on small screens instead of
// repeating them.
const MobileHeaderContext = createContext({
  title: null,
  actions: null,
  action: null,
  setTitle: () => {},
  setActions: () => {},
  setAction: () => {},
});

export function MobileHeaderProvider({ children }) {
  const [title, setTitle] = useState(null);
  const [actions, setActions] = useState(null);
  const [action, setAction] = useState(null);
  return (
    <MobileHeaderContext.Provider value={{ title, setTitle, actions, setActions, action, setAction }}>
      {children}
    </MobileHeaderContext.Provider>
  );
}

export function useMobileHeader() {
  return useContext(MobileHeaderContext);
}

/**
 * title:   text shown in the header.
 * action:  { label, onClick } → the purple "+ label" button; false → no button;
 *          undefined → the default "+ Cita / + Reserva".
 * actions: custom JSX that replaces the button entirely.
 */
export function useSetMobileHeader({ title, actions, action }) {
  const { setTitle, setActions, setAction } = useMobileHeader();
  const onClickRef = useRef(null);
  onClickRef.current = action ? action.onClick : null;
  const actionKey = action === false ? false : action ? action.label : undefined;
  useEffect(() => {
    if (title !== undefined) setTitle(title);
    if (actions !== undefined) setActions(actions);
    if (actionKey === false) setAction(false);
    else if (actionKey) setAction({ label: actionKey, onClick: () => onClickRef.current?.() });
    return () => {
      setTitle(null);
      setActions(null);
      setAction(null);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, actions, actionKey]);
}
