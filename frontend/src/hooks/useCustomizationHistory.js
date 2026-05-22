import { useState, useCallback } from 'react';

export function useCustomizationHistory(initialState) {
  const [past, setPast] = useState([]);
  const [present, setPresent] = useState(initialState);
  const [future, setFuture] = useState([]);

  const setCustomization = useCallback((newCustomizationOrUpdater) => {
    setPresent((current) => {
      const nextState =
        typeof newCustomizationOrUpdater === 'function'
          ? newCustomizationOrUpdater(current)
          : newCustomizationOrUpdater;

      // Don't save if state hasn't changed
      if (nextState === current) return current;

      setPast((prevPast) => {
        const newPast = [...prevPast, current];
        // Keep max 50 steps
        return newPast.slice(-50);
      });
      setFuture([]); // Clear future on new action
      return nextState;
    });
  }, []);

  const undo = useCallback(() => {
    setPast((prevPast) => {
      if (prevPast.length === 0) return prevPast;
      const previous = prevPast[prevPast.length - 1];
      const newPast = prevPast.slice(0, -1);
      
      setPresent((current) => {
        setFuture((prevFuture) => [current, ...prevFuture]);
        return previous;
      });
      
      return newPast;
    });
  }, []);

  const redo = useCallback(() => {
    setFuture((prevFuture) => {
      if (prevFuture.length === 0) return prevFuture;
      const next = prevFuture[0];
      const newFuture = prevFuture.slice(1);
      
      setPresent((current) => {
        setPast((prevPast) => [...prevPast, current]);
        return next;
      });
      
      return newFuture;
    });
  }, []);

  return {
    customization: present,
    setCustomization,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    historyLength: past.length,
  };
}
