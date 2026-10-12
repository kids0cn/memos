import { useState } from "react";
import { MonthCalendar } from "@/components/ActivityCalendar";
import { Switch } from "@/components/ui/switch";
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
  const navigateToDateFilter = useDateFilterNavigation();
  const t = useTranslate();
  const [visibleMonthString, setVisibleMonthString] = useState(getCurrentMonth);
  const [onlyDaysWithEntries, setOnlyDaysWithEntries] = useLocalStorage(ONLY_DAYS_WITH_ENTRIES_STORAGE_KEY, false);
  const selectedDate = filters.find((filter) => filter.factor === "displayTime")?.value;

  // The same path for the grid and the title's date picker: filter, then close the picker.
  const handleDateSelect = (date: string) => {
    setVisibleMonthString(date.slice(0, 7));
    navigateToDateFilter(date);
    props.onDateSelect?.();
  };

  const handleToggleOnlyDaysWithEntries = (next: boolean) => {
    setOnlyDaysWithEntries(next);
    if (next) {
      // Land on a month that holds entries; stays put when the current one is already
      // empty and no earlier month exists, or when there is no data at all.
      const nearest = findNearestActiveMonth(visibleMonthString, activityStats);
      if (nearest && nearest !== visibleMonthString) {
        setVisibleMonthString(nearest);
      }
    }
  };

  return (
    <div className="group flex w-full flex-col text-muted-foreground animate-fade-in">
      <MonthNavigator
        visibleMonth={visibleMonthString}
        onMonthChange={setVisibleMonthString}
        activityStats={activityStats}
        skipEmptyMonths={onlyDaysWithEntries}
        selectedDate={selectedDate}
        onPickDate={handleDateSelect}
      />

      <div className="w-full animate-scale-in">
        <MonthCalendar
          month={visibleMonthString}
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
