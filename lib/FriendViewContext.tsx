import React, { createContext, useContext, useState, useCallback } from "react";

interface FriendViewState {
  viewFriendId: string | null;
  viewFriendName: string | null;
}

interface FriendViewContextValue extends FriendViewState {
  setFriendView: (id: string, name: string) => void;
  clearFriendView: () => void;
  isFriendView: boolean;
}

const FriendViewContext = createContext<FriendViewContextValue | null>(null);

export function FriendViewProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<FriendViewState>({
    viewFriendId: null,
    viewFriendName: null,
  });

  const setFriendView = useCallback((id: string, name: string) => {
    setState({ viewFriendId: id, viewFriendName: name });
  }, []);

  const clearFriendView = useCallback(() => {
    setState({ viewFriendId: null, viewFriendName: null });
  }, []);

  const value: FriendViewContextValue = {
    ...state,
    setFriendView,
    clearFriendView,
    isFriendView: !!state.viewFriendId,
  };

  return (
    <FriendViewContext.Provider value={value}>
      {children}
    </FriendViewContext.Provider>
  );
}

export function useFriendView() {
  const ctx = useContext(FriendViewContext);
  if (!ctx) {
    return {
      viewFriendId: null,
      viewFriendName: null,
      setFriendView: () => {},
      clearFriendView: () => {},
      isFriendView: false,
    };
  }
  return ctx;
}
