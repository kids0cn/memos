import type { MemoTimeBasis } from "@/contexts/ViewContext";

export interface StatisticsViewProps {
  className?: string;
}

export interface MonthNavigatorProps {
  visibleMonth: string;
  onMonthChange: (month: string) => void;
  /** Full-history day → count map; drives skip-empty-month navigation when enabled. */
  activityStats?: Record<string, number>;
  /** Arrows jump only across months that hold entries; off = step one month at a time. */
  skipEmptyMonths?: boolean;
  /** Picking a day in the title's date picker; applies the date filter like clicking a cell. */
  onPickDate?: (date: string) => void;
  /** ISO date of the day currently used as a filter, if any. */
  selectedDate?: string;
}

export interface StatisticsData {
  activityStats: Record<string, number>;
  timeBasis: MemoTimeBasis;
}
