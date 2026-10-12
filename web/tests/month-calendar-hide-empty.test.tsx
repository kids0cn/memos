import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CalendarCell } from "@/components/ActivityCalendar/CalendarCell";
import { MonthCalendar } from "@/components/ActivityCalendar/MonthCalendar";
import type { CalendarDayCell } from "@/components/ActivityCalendar/types";

vi.mock("@/contexts/InstanceContext", () => ({
  useInstance: () => ({ generalSetting: { weekStartDayOffset: 0 } }),
}));
vi.mock("@/utils/i18n", () => ({ useTranslate: () => (key: string) => key }));

const makeDay = (overrides: Partial<CalendarDayCell> = {}): CalendarDayCell => ({
  date: "2026-05-03",
  label: 3,
  count: 0,
  isCurrentMonth: true,
  isToday: false,
  isSelected: false,
  ...overrides,
});

describe("CalendarCell hideEmptyDays", () => {
  it("renders a count==0 day as a blank placeholder: no numeral, no button", () => {
    const { container } = render(<CalendarCell day={makeDay()} maxCount={5} tooltipText="2026-05-03" onClick={() => {}} hideEmptyDays />);

    expect(container.querySelector("[data-slot='calendar-empty-cell']")).not.toBeNull();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText("3")).not.toBeInTheDocument();
  });

  it("keeps a count>0 day as an interactive button with its numeral", () => {
    const onClick = vi.fn();
    render(
      <CalendarCell day={makeDay({ count: 2 })} maxCount={5} tooltipText="memo.count-memos-in-date" onClick={() => {}} hideEmptyDays />,
    );

    const button = screen.getByRole("button", { name: /memo.count-memos-in-date/ });
    expect(button).toHaveTextContent("3");
    expect(onClick).not.toHaveBeenCalled();
  });

  it("is a no-op for empty days when hideEmptyDays is off (zero regression)", () => {
    render(<CalendarCell day={makeDay()} maxCount={5} tooltipText="2026-05-03" onClick={() => {}} />);

    expect(screen.getByRole("button", { name: /2026-05-03/ })).toHaveTextContent("3");
    expect(document.querySelector("[data-slot='calendar-empty-cell']")).toBeNull();
  });
});

describe("MonthCalendar hideEmptyDays", () => {
  const data = { "2026-05-03": 2 };

  it("draws only days with entries as buttons and blanks the rest, keeping the 7-column grid", () => {
    const { container } = render(<MonthCalendar month="2026-05" data={data} hideEmptyDays />);

    // One button = the single day with an entry; every other cell is a placeholder.
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByRole("button")).toHaveTextContent("3");
    expect(screen.queryByText("1")).not.toBeInTheDocument();
    expect(screen.queryByText("31")).not.toBeInTheDocument();

    const placeholders = container.querySelectorAll("[data-slot='calendar-empty-cell']");
    // 42 grid cells for May 2026 (6 whole weeks) minus the one filled day.
    expect(placeholders).toHaveLength(41);
    expect(placeholders.length + 1).toBe(42);
  });

  it("renders every in-month day as before when the flag is off", () => {
    render(<MonthCalendar month="2026-05" data={data} />);

    // 31 in-month buttons; out-of-month padding days have always been plain divs.
    expect(screen.getAllByRole("button")).toHaveLength(31);
    expect(document.querySelector("[data-slot='calendar-empty-cell']")).toBeNull();
  });
});
