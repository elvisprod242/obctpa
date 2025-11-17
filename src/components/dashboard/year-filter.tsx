'use client';

import * as React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useYearFilter } from '@/context/year-filter-context';

export function YearFilter() {
  const { selectedYear, setSelectedYear, availableYears } = useYearFilter();

  // Don't render anything on the server or until the value has been hydrated from localStorage on the client.
  if (selectedYear === undefined) {
    return null; 
  }

  return (
    <Select value={selectedYear} onValueChange={setSelectedYear}>
      <SelectTrigger className="w-auto">
        <SelectValue placeholder="Filtrer par année" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Toutes les années</SelectItem>
        {availableYears.map((year) => (
          <SelectItem key={year} value={year}>
            {year}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
