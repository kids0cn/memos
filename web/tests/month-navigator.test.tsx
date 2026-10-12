import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SIDEBAR_ROW_BOX_CLASSES } from "@/components/AppSidebar/SidebarRow";
import { MonthNavigator } from "@/components/StatisticsView/MonthNavigator";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ i18n: { language: "en" }, t: (key: string) => key }),
}));
vi.mock("@/contexts/InstanceContext", () => ({
  useInstance: () => ({ generalSetting: { weekStartDayOffset: 0 } }),
}));
vi.mock("@/utils/i18n", () => ({ useTranslate: () => (key: string) => key }));

describe("MonthNavigator", () => {
  it("keeps only previous and next month actions", () => {
    const onMonthChange = vi.fn();
    render(<MonthNavigator visibleMonth="2026-08" onMonthChange={onMonthChange} />);

    const heading = screen.getByRole("heading", { name: "August 2026", level: 2 });
    expect(heading).toBeInTheDocument();
    expect(heading.closest("header")).toHaveClass(...SIDEBAR_ROW_BOX_CLASSES.split(" "));
    expect(screen.queryByRole("button", { name: "Select month" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "common.previous-month" }));
    expect(onMonthChange).toHaveBeenCalledWith("2026-07");

    fireEvent.click(screen.getByRole("button", { name: "common.next-month" }));
    expect(onMonthChange).toHaveBeenCalledWith("2026-09");
  });

  it("steps one month at a time when skipEmptyMonths is off", () => {
    const onMonthChange = vi.fn();
    render(<MonthNavigator visibleMonth="2026-08" onMonthChange={onMonthChange} activityStats={{ "2024-06-01": 1 }} />);

    fireEvent.click(screen.getByRole("button", { name: "common.next-month" }));
    expect(onMonthChange).toHaveBeenCalledWith("2026-09");
  });

  describe("skipEmptyMonths", () => {
    const activityStats = { "2024-05-10": 1, "2024-08-01": 2 };

    it("jumps only across months that hold entries", () => {
      const onMonthChange = vi.fn();
      render(<MonthNavigator visibleMonth="2024-06" onMonthChange={onMonthChange} activityStats={activityStats} skipEmptyMonths />);

      fireEvent.click(screen.getByRole("button", { name: "common.previous-month" }));
      expect(onMonthChange).toHaveBeenCalledWith("2024-05");

      fireEvent.click(screen.getByRole("button", { name: "common.next-month" }));
      expect(onMonthChange).toHaveBeenCalledWith("2024-08");
    });

    it("stays on the current month at the ends instead of looping", () => {
      const onMonthChange = vi.fn();
      render(<MonthNavigator visibleMonth="2024-08" onMonthChange={onMonthChange} activityStats={activityStats} skipEmptyMonths />);

      fireEvent.click(screen.getByRole("button", { name: "common.next-month" }));
      expect(onMonthChange).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole("button", { name: "common.previous-month" }));
      expect(onMonthChange).toHaveBeenCalledWith("2024-05");
    });

    it("stays put with no data at all", () => {
      const onMonthChange = vi.fn();
      render(<MonthNavigator visibleMonth="2026-06" onMonthChange={onMonthChange} activityStats={{}} skipEmptyMonths />);

      fireEvent.click(screen.getByRole("button", { name: "common.previous-month" }));
      fireEvent.click(screen.getByRole("button", { name: "common.next-month" }));
      expect(onMonthChange).not.toHaveBeenCalled();
    });
  });

  describe("date picker on the title", () => {
    it("opens a day grid from the month heading and picks a day through onPickDate", async () => {
      const onMonthChange = vi.fn();
      const onPickDate = vi.fn();
      render(<MonthNavigator visibleMonth="2026-08" onMonthChange={onMonthChange} onPickDate={onPickDate} activityStats={{}} />);

      // The heading itself carries the month label; the button inside it is the trigger.
      expect(screen.getByRole("heading", { name: "August 2026", level: 2 })).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "August 2026" }));

      const popup = await screen.findByLabelText("calendar.select-date");
      // Browse one month forward inside the popup, then pick a day.
      fireEvent.click(within(popup).getByRole("button", { name: "common.next-month" }));
      const day = within(popup).getByRole("button", { name: "2026-09-15" });
      fireEvent.click(day);

      expect(onPickDate).toHaveBeenCalledWith("2026-09-15");
      // The picker closes after the pick; the heading keeps the shown month.
      expect(screen.queryByLabelText("calendar.select-date")).not.toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "August 2026", level: 2 })).toBeInTheDocument();
      expect(onMonthChange).not.toHaveBeenCalled();
    });
  });
});
