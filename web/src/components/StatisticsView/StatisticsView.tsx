import { useCallback } from "react";
import { MonthCalendar } from "@/components/ActivityCalendar";
import { Switch } from "@/components/ui/switch";
import { useAppSidebar } from "@/contexts/AppSidebarContext";
import { useMemoFilterContext } from "@/contexts/MemoFilterContext";
import { useDateFilterNavigation } from "@/hooks";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { findNearestActiveMonth, getCurrentMonth } from "@/lib/calendar-utils";
import type { StatisticsData } from "@/types/statistics";
import { useTranslate } from "@/utils/i18n";
import { MonthNavigator } from "./MonthNavigator";

/**
 * localStorage key persisting the sidebar calendar's "only days with entries" switch
 * across reloads (`true`/`false`, JSON-encoded by useLocalStorage).
 */
const ONLY_DAYS_WITH_ENTRIES_STORAGE_KEY = "sidebar-calendar-only-days-with-entries";

interface Props {
  statisticsData: StatisticsData;
  onDateSelect?: () => void;
}

const StatisticsView = (props: Props) => {
  const { statisticsData } = props;
  const { activityStats, timeBasis } = statisticsData;
  const { filters } = useMemoFilterContext();
  const { calendarMonth, setCalendarMonth } = useAppSidebar();
  const navigateToDateFilter = useDateFilterNavigation();
  const t = useTranslate();
  const [onlyDaysWithEntries, setOnlyDaysWithEntries] = useLocalStorage(ONLY_DAYS_WITH_ENTRIES_STORAGE_KEY, false);
  const selectedDate = filters.find((filter) => filter.factor === "displayTime")?.value;

  // The window belongs to the active date filter and browsing months is a temporary override on top
  // of it. An override recorded against a different filter value is ignored outright, so the window
  // can never lag the filter and no render shows a month the user has already left.
  const filterMonth = selectedDate ? selectedDate.slice(0, 7) : getCurrentMonth();
  const browsedMonth = calendarMonth && calendarMonth.filterValue === selectedDate ? calendarMonth.month : undefined;
  const visibleMonth = browsedMonth ?? filterMonth;

  const handleMonthChange = useCallback(
    (month: string) => setCalendarMonth({ month, filterValue: selectedDate }),
    [setCalendarMonth, selectedDate],
  );

  // The same path for the grid and the title's date picker: filter, then close the picker. Dropping
  // the override re-centres the window on the picked day's month, through the filter itself.
  const handleDateSelect = (date: string) => {
    setCalendarMonth(undefined);
    navigateToDateFilter(date);
    props.onDateSelect?.();
  };

  const handleToggleOnlyDaysWithEntries = (next: boolean) => {
    setOnlyDaysWithEntries(next);
    if (next) {
      // Land on a month that holds entries; stays put when the current one is already
      // empty and no earlier month exists, or when there is no data at all.
      const nearest = findNearestActiveMonth(visibleMonth, activityStats);
      if (nearest && nearest !== visibleMonth) {
        setCalendarMonth({ month: nearest, filterValue: selectedDate });
      }
    }
  };

  return (
    <div className="group flex w-full flex-col text-muted-foreground animate-fade-in">
      <MonthNavigator
        visibleMonth={visibleMonth}
        onMonthChange={handleMonthChange}
        activityStats={activityStats}
        skipEmptyMonths={onlyDaysWithEntries}
        selectedDate={selectedDate}
        onPickDate={handleDateSelect}
      />

      <div className="w-full animate-scale-in">
        <MonthCalendar
          month={visibleMonth}
          data={activityStats}
          selectedDate={selectedDate}
          onClick={handleDateSelect}
          timeBasis={timeBasis}
          hideEmptyDays={onlyDaysWithEntries}
        />
      </div>

      <label className="mt-1.5 flex cursor-pointer items-center justify-between gap-2 rounded-md px-1 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
        <span className="truncate">{t("common.only-days-with-entries")}</span>
        <Switch checked={onlyDaysWithEntries} onCheckedChange={handleToggleOnlyDaysWithEntries} />
      </label>
    </div>
  );
};

export default StatisticsView;
