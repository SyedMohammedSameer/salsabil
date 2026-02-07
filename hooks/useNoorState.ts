// useNoorState — State machine for Noor AI orb
import { useState, useCallback, useRef, useEffect } from 'react';
import type { NoorState } from '../types';

interface UseNoorStateReturn {
  state: NoorState;
  setState: (state: NoorState) => void;
  transitionTo: (state: NoorState, autoRevertMs?: number) => void;
  isActive: boolean;
}

export const useNoorState = (initialState: NoorState = 'idle'): UseNoorStateReturn => {
  const [state, setState] = useState<NoorState>(initialState);
  const revertTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear any pending revert when unmounting
  useEffect(() => {
    return () => {
      if (revertTimeoutRef.current) clearTimeout(revertTimeoutRef.current);
    };
  }, []);

  const transitionTo = useCallback((newState: NoorState, autoRevertMs?: number) => {
    if (revertTimeoutRef.current) clearTimeout(revertTimeoutRef.current);
    setState(newState);

    if (autoRevertMs && newState !== 'idle') {
      revertTimeoutRef.current = setTimeout(() => {
        setState('idle');
      }, autoRevertMs);
    }
  }, []);

  const isActive = state !== 'idle';

  return { state, setState, transitionTo, isActive };
};

export default useNoorState;
