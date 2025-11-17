'use client';

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from 'react';

const monthNames = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

type MonthFilterContextType = {
  selectedMonth: string | undefined;
  setSelectedMonth: (month: string) => void;
  monthNames: string[];
};

const MonthFilterContext = createContext<MonthFilterContextType | undefined>(
  undefined
);

export function MonthFilterProvider({ children }: { children: ReactNode }) {
  const [selectedMonth, setSelectedMonth] = useState<string | undefined>(undefined);

  // 1. On initial client-side render, hydrate the state from localStorage.
  useEffect(() => {
    try {
      const savedMonth = localStorage.getItem('selectedMonth');
      if (savedMonth) {
        setSelectedMonth(savedMonth);
      } else {
        setSelectedMonth((new Date().getMonth() + 1).toString());
      }
    } catch (e) {
      console.error('Failed to access localStorage for selectedMonth', e);
      setSelectedMonth((new Date().getMonth() + 1).toString());
    }
  }, []); // Empty dependency array ensures this runs only once on mount.

  // 2. When selectedMonth changes (and is not undefined), update localStorage.
  useEffect(() => {
    if (selectedMonth !== undefined) {
      try {
        localStorage.setItem('selectedMonth', selectedMonth);
      } catch (e) {
        console.error('Failed to write to localStorage for selectedMonth', e);
      }
    }
  }, [selectedMonth]);

  const value = {
    selectedMonth,
    setSelectedMonth: (month: string) => setSelectedMonth(month),
    monthNames,
  };

  return (
    <MonthFilterContext.Provider value={value}>
      {children}
    </MonthFilterContext.Provider>
  );
}

export function useMonthFilter() {
  const context = useContext(MonthFilterContext);
  if (context === undefined) {
    throw new Error('useMonthFilter must be used within a MonthFilterProvider');
  }
  return context;
}
