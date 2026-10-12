import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { MonthCalendar } from "@/components/ActivityCalendar";
import { buttonVariants } from "@/components/ui/button";
import { FOCUS_VISIBLE_OUTLINE_CLASSES } from "@/components/ui/focus";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { addMonths, formatMonthLabel, getActiveMonths, getActiveYears, getCurrentMonth } from "@/lib/calendar-utils";
import { cn } from "@/lib/utils";

export interface DayPickerProps {
  /** `YYYY-MM` the sidebar shows; the popup opens on it and resets to it whenever it reopens. */
  month: string;
  activityStats?: Record<string, number>;
  /** ISO date of the day currently used as a filter, if any. */
  selectedDate?: string;
  /** Picking a day: applies the date filter exactly like clicking a grid cell, then closes. */
  onPick: (date: string) => void;
  children: ReactNode;
}

const ICON_CONTROL_CLASSES = cn(buttonVariants({ variant: "quiet", size: "icon-compact" }));
const TEXT_CONTROL_CLASSES = cn(buttonVariants({ variant: "quiet", size: "sm" }));

/** A header label that keeps the current look but drills one level up the zoom stack when clicked. */
const ZOOM_LABEL_CLASSES = cn(
  "min-w-0 truncate cursor-pointer select-none rounded-sm text-center text-sm font-medium tabular-nums text-foreground underline-offset-4 hover:underline",
  FOCUS_VISIBLE_OUTLINE_CLASSES,
);

/** A cell holding at least one entry: tinted and bold so it stands out from the empty choices. */
const ACTIVE_CELL_CLASSES = "bg-primary/12 font-medium text-foreground";

/** Zoom levels of the popup: the day grid, the twelve months of one year, the list of years. */
type ZoomLevel = "day" | "month" | "year";

const MONTH_INDEXES = Array.from({ length: 12 }, (_, index) => index);
const padMonth = (index: number) => String(index + 1).padStart(2, "0");

/**
 * The month title is the trigger; the popup zooms between three levels — day grid, month
 * grid of one year, list of years — so a day years back is a few clicks away instead of a
 * long run of month arrows. Labels step up (day → month → year); cells step back down.
 */
export const DayPicker = ({ month, activityStats = {}, selectedDate, onPick, children }: DayPickerProps) => {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [pickMonth, setPickMonth] = useState(month);
  const [level, setLevel] = useState<ZoomLevel>("day");

  // Reopening lands on the shown month's day grid, not wherever browsing was left.
  useEffect(() => {
    if (open) {
      setPickMonth(month);
      setLevel("day");
    }
  }, [open, month]);

  const pickYear = Number(pickMonth.slice(0, 4));
  const currentYear = Number(getCurrentMonth().slice(0, 4));
  const activeMonths = useMemo(() => new Set(getActiveMonths(activityStats)), [activityStats]);
  const activeYears = useMemo(() => new Set(getActiveYears(activityStats)), [activityStats]);
  // The list spans the earliest entry up to the current year, always keeping the shown year reachable.
  const years = useMemo(() => {
    const bounds = [...activeYears, currentYear, pickYear];
    const start = Math.min(...bounds);
    return Array.from({ length: Math.max(...bounds) - start + 1 }, (_, index) => start + index);
  }, [activeYears, currentYear, pickYear]);
  const monthShortLabels = useMemo(
    () => MONTH_INDEXES.map((index) => new Date(2000, index, 1).toLocaleString(i18n.language, { month: "short" })),
    [i18n.language],
  );

  // The year arrows stop at the list ends instead of wandering into years nothing shows.
  const stepYear = (direction: -1 | 1) => {
    const target = pickYear + direction;
    if (target < years[0] || target > years[years.length - 1]) return;
    setPickMonth(`${target}-${pickMonth.slice(5, 7)}`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="max-w-full cursor-pointer truncate rounded-sm underline-offset-4 select-none hover:underline focus-visible:outline-none">
        {children}
      </PopoverTrigger>

      <PopoverContent align="start" sideOffset={6} aria-label={t("calendar.select-date")} className="w-64 p-2">
        {level === "day" && (
          <>
            <div className="mb-1 flex items-center">
              <button
                type="button"
                aria-label={t("common.previous-month")}
                className={ICON_CONTROL_CLASSES}
                onClick={() => setPickMonth(addMonths(pickMonth, -1))}
              >
                <ChevronLeftIcon className="rtl:rotate-180" strokeWidth={1.75} />
              </button>
              <button type="button" className={ZOOM_LABEL_CLASSES} onClick={() => setLevel("month")}>
                {formatMonthLabel(pickMonth, i18n.language)}
              </button>
              <button
                type="button"
                aria-label={t("common.next-month")}
                className={ICON_CONTROL_CLASSES}
                onClick={() => setPickMonth(addMonths(pickMonth, 1))}
              >
                <ChevronRightIcon className="rtl:rotate-180" strokeWidth={1.75} />
              </button>
            </div>

            <MonthCalendar
              month={pickMonth}
              data={activityStats}
              selectedDate={selectedDate}
              onClick={(date) => {
                onPick(date);
                setOpen(false);
              }}
            />
          </>
        )}

        {level === "month" && (
          <>
            <div className="mb-1 flex items-center">
              <button type="button" aria-label={t("calendar.previous-year")} className={ICON_CONTROL_CLASSES} onClick={() => stepYear(-1)}>
                <ChevronLeftIcon className="rtl:rotate-180" strokeWidth={1.75} />
              </button>
              <button type="button" className={ZOOM_LABEL_CLASSES} onClick={() => setLevel("year")}>
                {pickYear}
              </button>
              <button type="button" aria-label={t("calendar.next-year")} className={ICON_CONTROL_CLASSES} onClick={() => stepYear(1)}>
                <ChevronRightIcon className="rtl:rotate-180" strokeWidth={1.75} />
              </button>
            </div>

            <div role="group" aria-label={t("calendar.select-month")} className="grid grid-cols-3 gap-0.5">
              {MONTH_INDEXES.map((index) => {
                const key = `${pickYear}-${padMonth(index)}`;
                const hasEntries = activeMonths.has(key);
                return (
                  <button
                    key={key}
                    type="button"
                    aria-label={formatMonthLabel(key, i18n.language)}
                    aria-current={key === pickMonth ? "page" : undefined}
                    data-active={hasEntries ? "true" : undefined}
                    className={cn(TEXT_CONTROL_CLASSES, "relative text-foreground", hasEntries && ACTIVE_CELL_CLASSES)}
                    onClick={() => {
                      setPickMonth(key);
                      setLevel("day");
                    }}
                  >
                    {monthShortLabels[index]}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {level === "year" && (
          <div role="group" aria-label={`${years[0]}–${years[years.length - 1]}`} className="grid grid-cols-3 gap-0.5">
            {years.map((year) => {
              const hasEntries = activeYears.has(year);
              return (
                <button
                  key={year}
                  type="button"
                  aria-current={year === pickYear ? "page" : undefined}
                  data-active={hasEntries ? "true" : undefined}
                  className={cn(TEXT_CONTROL_CLASSES, "tabular-nums text-foreground", hasEntries && ACTIVE_CELL_CLASSES)}
                  onClick={() => {
                    setPickMonth(`${year}-${pickMonth.slice(5, 7)}`);
                    setLevel("month");
                  }}
                >
                  {year}
                </button>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
