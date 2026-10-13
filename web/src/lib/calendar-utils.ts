import dayjs from "dayjs";
import type { MemoTimeBasis } from "@/contexts/ViewContext";
import { combineCELFilters } from "@/lib/cel-filter";

export const MONTH_DATE_FORMAT = "YYYY-MM" as const;
export const ISO_DATE_FORMAT = "YYYY-MM-DD" as const;

export const getToday = (): string => dayjs().format(ISO_DATE_FORMAT);
export const getCurrentMonth = (): string => dayjs().format(MONTH_DATE_FORMAT);

export const addMonths = (date: Date | string, count: number): string => {
  return dayjs(date).add(count, "month").format(MONTH_DATE_FORMAT);
};

/** "August 2026" for `YYYY-MM`, in the viewer's language. */
export const formatMonthLabel = (month: string, locale: string): string =>
  dayjs(month).toDate().toLocaleString(locale, { year: "numeric", month: "long" });

/** Months holding at least one entry, sorted ascending as `YYYY-MM`. */
export const getActiveMonths = (activityStats: Record<string, number>): string[] => {
  const months = new Set<string>();
  for (const date of Object.keys(activityStats)) {
    months.add(date.slice(0, 7));
  }
  return [...months].sort();
};

/** Years holding at least one entry, sorted ascending. */
export const getActiveYears = (activityStats: Record<string, number>): number[] => {
  const years = new Set<number>();
  for (const date of Object.keys(activityStats)) {
    years.add(Number(date.slice(0, 4)));
  }
  return [...years].sort((a, b) => a - b);
};

/**
 * The closest month with entries strictly before (`direction` -1) or after (`direction` 1)
 * `currentMonth`, or null when the data holds no such month — the caller then stays put.
 */
export const findAdjacentActiveMonth = (currentMonth: string, activityStats: Record<string, number>, direction: -1 | 1): string | null => {
  const months = getActiveMonths(activityStats);
  if (direction > 0) {
    return months.find((month) => month > currentMonth) ?? null;
  }
  const earlier = months.filter((month) => month < currentMonth);
  return earlier.length > 0 ? earlier[earlier.length - 1] : null;
};

/**
 * The month to land on when "only months with entries" turns on: the closest month at or
 * before `currentMonth`, else the earliest month after it, else null when there is no data.
 */
export const findNearestActiveMonth = (currentMonth: string, activityStats: Record<string, number>): string | null => {
  const months = getActiveMonths(activityStats);
  if (months.length === 0) return null;
  if (months.includes(currentMonth)) return currentMonth;
  const earlier = months.filter((month) => month < currentMonth);
  if (earlier.length > 0) return earlier[earlier.length - 1];
  return months[0];
};

/**
 * The closest day with entries strictly before (`direction` -1) or after (`direction` 1)
 * `anchorDate`, or null when the data holds no such day — the caller then disables the jump.
 */
export const findAdjacentEntryDate = (anchorDate: string, activityStats: Record<string, number>, direction: -1 | 1): string | null => {
  const dates = Object.keys(activityStats).sort();
  if (direction > 0) {
    return dates.find((date) => date > anchorDate) ?? null;
  }
  const earlier = dates.filter((date) => date < anchorDate);
  return earlier.length > 0 ? earlier[earlier.length - 1] : null;
};

/**
 * The local midnight named by `YYYY-MM-DD`, or undefined for anything else — including
 * dates JS would silently roll forward (2026-02-30 → March 2).
 */
export const parseLocalDate = (value: string): Date | undefined => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const candidate = new Date(year, month - 1, day);
  if (candidate.getFullYear() !== year || candidate.getMonth() !== month - 1 || candidate.getDate() !== day) return undefined;
  return candidate;
};

/** A half-open `[start, end)` window in epoch seconds, in the viewer's local time zone. */
export interface LocalTimestampRange {
  startTimestamp: number;
  endTimestamp: number;
}

const toRange = (start: Date, end: Date): LocalTimestampRange => ({
  startTimestamp: Math.floor(start.getTime() / 1000),
  endTimestamp: Math.floor(end.getTime() / 1000),
});

/** The local calendar day named by `YYYY-MM-DD`, or undefined for an invalid date. */
export const getLocalDayTimestampRange = (value: string): LocalTimestampRange | undefined => {
  const start = parseLocalDate(value);
  if (!start) return undefined;
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return toRange(start, end);
};

/** The local calendar month named by `YYYY-MM`, or undefined for an invalid month. */
export const getLocalMonthTimestampRange = (value: string): LocalTimestampRange | undefined => {
  const start = parseLocalDate(`${value}-01`);
  if (!start) return undefined;
  return toRange(start, new Date(start.getFullYear(), start.getMonth() + 1, 1));
};

/** The CEL timestamp field a time basis is stored under. */
export const getTimeBasisField = (timeBasis: MemoTimeBasis): "created_ts" | "updated_ts" =>
  timeBasis === "update_time" ? "updated_ts" : "created_ts";

/** A CEL clause selecting memos whose `field` falls inside `range`. */
export const buildTimestampRangeFilter = (field: "created_ts" | "updated_ts", range: LocalTimestampRange): string =>
  `${field} >= timestamp(${range.startTimestamp}) && ${field} < timestamp(${range.endTimestamp})`;

/** `filter` narrowed to memos whose `timeBasis` timestamp falls inside `range`; unchanged when there is no range. */
export const withTimestampRange = (
  filter: string | undefined,
  range: LocalTimestampRange | undefined,
  timeBasis: MemoTimeBasis,
): string | undefined => (range ? combineCELFilters(filter, buildTimestampRangeFilter(getTimeBasisField(timeBasis), range)) : filter);
