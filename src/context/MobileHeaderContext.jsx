import { createContext, useContext, useState, useEffect, useRef } from 'react';

// The phone header (below xl) shows the page title and its main action, so
// pages hide their own title and main button on small screens instead of
// repeating them.
const MobileHeaderContext = createContext({
  title: null,
  actions: null,
  action: null,
  menu: null,
  setMenu: () => {},
  setTitle: () => {},
  setActions: () => {},
  setAction: () => {},
});

export function MobileHeaderProvider({ children }) {
  const [title, setTitle] = useState(null);
  const [actions, setActions] = useState(null);
  const [action, setAction] = useState(null);
  const [menu, setMenu] = useState(null);
  return (
    <MobileHeaderContext.Provider value={{ title, setTitle, actions, setActions, action, setAction, menu, setMenu }}>
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
 * menu:    [{ label, onClick }] → the secondary actions, in a ⋯ menu next to the button.
 */
export function useSetMobileHeader({ title, actions, action, menu }) {
  const { setTitle, setActions, setAction, setMenu } = useMobileHeader();
  const items = (menu || []).filter(Boolean);
  const menuRef = useRef(items);
  menuRef.current = items;
  const menuKey = items.map((i) => i.label).join('|');
  useEffect(() => {
    setMenu(menuKey ? menuKey.split('|').map((label, n) => ({ label, onClick: () => menuRef.current[n]?.onClick() })) : null);
    return () => setMenu(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuKey]);
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
