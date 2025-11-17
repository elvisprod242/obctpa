import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, parseISO, parse } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) {
    return 'N/A';
  }
  try {
    let date: Date;
    // Handle YYYY-MM-DD from date inputs or ISO strings
    if (dateString.includes('-') && dateString.length >= 10) {
        date = parseISO(dateString);
    } else if (dateString.includes('/')) {
        // Handle DD/MM/YYYY
        date = parse(dateString, 'dd/MM/yyyy', new Date());
    } else {
        // Attempt with new Date() as a fallback for other string formats
        date = new Date(dateString);
    }

    if (!isNaN(date.getTime())) {
        return format(date, 'dd-MM-yyyy');
    }

    return dateString; // Return original string if all parsing fails
  } catch (error) {
    return dateString; // In case of invalid date string, return it as is.
  }
}
