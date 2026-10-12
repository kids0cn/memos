import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DayPicker } from "@/components/StatisticsView/DayPicker";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ i18n: { language: "en" }, t: (key: string) => key }),
}));
vi.mock("@/contexts/InstanceContext", () => ({
  useInstance: () => ({ generalSetting: { weekStartDayOffset: 0 } }),
}));
vi.mock("@/utils/i18n", () => ({ useTranslate: () => (key: string) => key }));

// The year list runs from the earliest entry to the current year, so both ends come from the clock.
const CURRENT_YEAR = new Date().getFullYear();
const EARLIEST_YEAR = 2013;
const TRIGGER_LABEL = `May ${CURRENT_YEAR}`;
const activityStats = {
  "2013-05-10": 2,
  "2013-12-25": 1,
  [`${CURRENT_YEAR}-05-03`]: 1,
  [`${CURRENT_YEAR}-12-25`]: 1,
};

const openPicker = async () => {
  render(
    <DayPicker month={`${CURRENT_YEAR}-05`} activityStats={activityStats} onPick={vi.fn()}>
      {TRIGGER_LABEL}
    </DayPicker>,
  );
  fireEvent.click(screen.getByRole("button", { name: TRIGGER_LABEL }));
  return screen.findByLabelText("calendar.select-date");
};

/** The day-level month label is the way up to the month grid. */
const zoomToMonths = (popup: HTMLElement) => fireEvent.click(within(popup).getByRole("button", { name: TRIGGER_LABEL }));
/** The month-level year label is the way up to the year list. */
const zoomToYears = (popup: HTMLElement) => fireEvent.click(within(popup).getByRole("button", { name: String(CURRENT_YEAR) }));

describe("DayPicker zoom levels", () => {
  it("zooms day → month → year and drills back down level by level", async () => {
    const popup = await openPicker();

    // Day level: the day grid with its one-month arrows.
    expect(within(popup).getByRole("group", { name: `Calendar for ${CURRENT_YEAR}-05` })).toBeInTheDocument();
    expect(within(popup).getByRole("button", { name: "common.previous-month" })).toBeInTheDocument();
    expect(within(popup).getByRole("button", { name: "common.next-month" })).toBeInTheDocument();

    // Up to the month level: twelve cells, year arrows, the day grid gone.
    zoomToMonths(popup);
    expect(within(popup).getByRole("group", { name: "calendar.select-month" })).toBeInTheDocument();
    expect(within(popup).getByRole("button", { name: "calendar.previous-year" })).toBeInTheDocument();
    expect(within(popup).getByRole("button", { name: "calendar.next-year" })).toBeInTheDocument();
    expect(within(popup).queryByRole("group", { name: `Calendar for ${CURRENT_YEAR}-05` })).not.toBeInTheDocument();
    expect(
      within(popup).getAllByRole("button", {
        name: /^(January|February|March|April|May|June|July|August|September|October|November|December) /,
      }),
    ).toHaveLength(12);
    expect(within(popup).getByRole("button", { name: `May ${CURRENT_YEAR}` })).toHaveAttribute("aria-current", "page");
    expect(within(popup).getByRole("button", { name: `December ${CURRENT_YEAR}` })).toHaveAttribute("data-active", "true");
    expect(within(popup).getByRole("button", { name: `February ${CURRENT_YEAR}` })).not.toHaveAttribute("data-active");

    // Up to the year level: only the year list remains, arrows dropped.
    zoomToYears(popup);
    expect(within(popup).queryByRole("button", { name: "calendar.previous-year" })).not.toBeInTheDocument();
    expect(within(popup).getByRole("group", { name: `${EARLIEST_YEAR}–${CURRENT_YEAR}` })).toBeInTheDocument();
    expect(within(popup).getAllByRole("button")).toHaveLength(CURRENT_YEAR - EARLIEST_YEAR + 1);
    expect(within(popup).getByRole("button", { name: String(CURRENT_YEAR) })).toHaveAttribute("aria-current", "page");
    expect(within(popup).getByRole("button", { name: String(EARLIEST_YEAR) })).toHaveAttribute("data-active", "true");
    expect(within(popup).getByRole("button", { name: String(EARLIEST_YEAR + 1) })).not.toHaveAttribute("data-active");

    // Back down: the earliest year returns to its month level.
    fireEvent.click(within(popup).getByRole("button", { name: String(EARLIEST_YEAR) }));
    expect(within(popup).getByRole("group", { name: "calendar.select-month" })).toBeInTheDocument();
    expect(within(popup).getByRole("button", { name: "May 2013" })).toHaveAttribute("aria-current", "page");

    // …and a month returns to that month's day grid.
    fireEvent.click(within(popup).getByRole("button", { name: "June 2013" }));
    expect(within(popup).getByRole("group", { name: "Calendar for 2013-06" })).toBeInTheDocument();
    expect(within(popup).getByRole("button", { name: "common.previous-month" })).toBeInTheDocument();
    expect(within(popup).getByRole("button", { name: "June 2013" })).toBeInTheDocument();
  });

  it("shows 2013 in the month level after picking 2013 in the year list", async () => {
    const popup = await openPicker();
    zoomToMonths(popup);
    zoomToYears(popup);
    fireEvent.click(within(popup).getByRole("button", { name: "2013" }));

    expect(within(popup).getByRole("button", { name: "2013" })).toBeInTheDocument();
    expect(within(popup).getByRole("button", { name: "January 2013" })).toBeInTheDocument();
    expect(within(popup).getByRole("button", { name: "December 2013" })).toBeInTheDocument();
    expect(within(popup).queryByRole("button", { name: `January ${CURRENT_YEAR}` })).not.toBeInTheDocument();
  });

  it("stops the year arrows at both ends of the year list", async () => {
    const popup = await openPicker();
    zoomToMonths(popup);

    // Top end: the current year — stepping past it stays put.
    fireEvent.click(within(popup).getByRole("button", { name: "calendar.next-year" }));
    expect(within(popup).getByRole("button", { name: String(CURRENT_YEAR) })).toBeInTheDocument();

    // One year back works, so the arrow is functional rather than dead.
    fireEvent.click(within(popup).getByRole("button", { name: "calendar.previous-year" }));
    expect(within(popup).getByRole("button", { name: String(CURRENT_YEAR - 1) })).toBeInTheDocument();

    // Bottom end: jump down to the earliest year, where previous-year stays put.
    fireEvent.click(within(popup).getByRole("button", { name: String(CURRENT_YEAR - 1) }));
    fireEvent.click(within(popup).getByRole("button", { name: String(EARLIEST_YEAR) }));
    fireEvent.click(within(popup).getByRole("button", { name: "calendar.previous-year" }));
    expect(within(popup).getByRole("button", { name: String(EARLIEST_YEAR) })).toBeInTheDocument();

    // …and stepping forward from the floor works.
    fireEvent.click(within(popup).getByRole("button", { name: "calendar.next-year" }));
    expect(within(popup).getByRole("button", { name: String(EARLIEST_YEAR + 1) })).toBeInTheDocument();
  });

  it("reopens on the day grid of the sidebar month", async () => {
    const popup = await openPicker();
    zoomToMonths(popup);
    zoomToYears(popup);
    fireEvent.click(within(popup).getByRole("button", { name: String(EARLIEST_YEAR) })); // parked on the 2013 month level

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByLabelText("calendar.select-date")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: TRIGGER_LABEL }));
    const reopened = await screen.findByLabelText("calendar.select-date");
    expect(within(reopened).getByRole("group", { name: `Calendar for ${CURRENT_YEAR}-05` })).toBeInTheDocument();
    expect(within(reopened).getByRole("button", { name: TRIGGER_LABEL })).toBeInTheDocument();
    expect(within(reopened).queryByRole("group", { name: "calendar.select-month" })).not.toBeInTheDocument();
    expect(within(reopened).queryByRole("button", { name: String(EARLIEST_YEAR) })).not.toBeInTheDocument();
  });

  it("keeps the day level arrows stepping one month at a time", async () => {
    const popup = await openPicker();

    fireEvent.click(within(popup).getByRole("button", { name: "common.previous-month" }));
    expect(within(popup).getByRole("group", { name: `Calendar for ${CURRENT_YEAR}-04` })).toBeInTheDocument();
    expect(within(popup).getByRole("button", { name: `April ${CURRENT_YEAR}` })).toBeInTheDocument();

    fireEvent.click(within(popup).getByRole("button", { name: "common.next-month" }));
    expect(within(popup).getByRole("group", { name: `Calendar for ${CURRENT_YEAR}-05` })).toBeInTheDocument();
  });
});
