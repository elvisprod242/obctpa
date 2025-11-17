'use client';

import * as React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMonthFilter } from '@/context/month-filter-context';

export function MonthFilter() {
  const { selectedMonth, setSelectedMonth, monthNames } = useMonthFilter();

  // Don't render anything on the server or until the value has been hydrated from localStorage on the client.
  if (selectedMonth === undefined) {
    return null; 
  }

  return (
    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
      <SelectTrigger className="w-auto">
        <SelectValue placeholder="Filtrer par mois" />
      </SelectTrigger>
      <SelectContent>
        {monthNames.map((month, index) => (
          <SelectItem key={index} value={(index + 1).toString()}>
            {month}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
