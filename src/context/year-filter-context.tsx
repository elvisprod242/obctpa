'use client';

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useMemo,
  useEffect,
} from 'react';

type YearFilterContextType = {
  selectedYear: string | undefined;
  setSelectedYear: (year: string) => void;
  availableYears: string[];
};

const YearFilterContext = createContext<YearFilterContextType | undefined>(
  undefined
);

export function YearFilterProvider({ children }: { children: ReactNode }) {
  const [selectedYear, setSelectedYear] = useState<string | undefined>(undefined);

  // 1. On initial client-side render, hydrate the state from localStorage.
  useEffect(() => {
    try {
      const savedYear = localStorage.getItem('selectedYear');
      if (savedYear) {
        setSelectedYear(savedYear);
      } else {
        setSelectedYear(new Date().getFullYear().toString());
      }
    } catch (e) {
      console.error('Failed to access localStorage for selectedYear', e);
      setSelectedYear(new Date().getFullYear().toString());
    }
  }, []); // Empty dependency array ensures this runs only once on mount.

  // 2. When selectedYear changes (and is not undefined), update localStorage.
  useEffect(() => {
    if (selectedYear !== undefined) {
      try {
        localStorage.setItem('selectedYear', selectedYear);
      } catch (e) {
        console.error('Failed to write to localStorage for selectedYear', e);
      }
    }
  }, [selectedYear]);

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const startYear = 2023; // You can adjust the start year if needed
    const years = [];
    for (let year = currentYear; year >= startYear; year--) {
      years.push(year.toString());
    }
    return years;
  }, []);

  const value = {
    selectedYear,
    setSelectedYear: (year: string) => setSelectedYear(year),
    availableYears,
  };

  return (
    <YearFilterContext.Provider value={value}>
      {children}
    </YearFilterContext.Provider>
  );
}

export function useYearFilter() {
  const context = useContext(YearFilterContext);
  if (context === undefined) {
    throw new Error('useYearFilter must be used within a YearFilterProvider');
  }
  return context;
}
