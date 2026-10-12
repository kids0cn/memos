import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MonthCalendar } from "@/components/ActivityCalendar";
import { buttonVariants } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { addMonths, formatMonthLabel } from "@/lib/calendar-utils";
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

/** The month title is the trigger; the popup is a browsable day grid over any month. */
export const DayPicker = ({ month, activityStats = {}, selectedDate, onPick, children }: DayPickerProps) => {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [pickMonth, setPickMonth] = useState(month);

  // Reopening lands on the shown month, not wherever browsing was left.
  useEffect(() => {
    if (open) setPickMonth(month);
  }, [open, month]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="max-w-full cursor-pointer truncate rounded-sm underline-offset-4 select-none hover:underline focus-visible:outline-none">
        {children}
      </PopoverTrigger>

      <PopoverContent align="start" sideOffset={6} aria-label={t("calendar.select-date")} className="w-64 p-2">
        <div className="mb-1 flex items-center">
          <button
            type="button"
            aria-label={t("common.previous-month")}
            className={ICON_CONTROL_CLASSES}
            onClick={() => setPickMonth(addMonths(pickMonth, -1))}
          >
            <ChevronLeftIcon className="rtl:rotate-180" strokeWidth={1.75} />
          </button>
          <span className="flex-1 text-center text-sm font-medium tabular-nums text-foreground">
            {formatMonthLabel(pickMonth, i18n.language)}
          </span>
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
      </PopoverContent>
    </Popover>
  );
};
