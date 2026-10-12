import { describe, expect, it } from "vitest";
import { findAdjacentActiveMonth, findNearestActiveMonth, getActiveMonths } from "@/lib/calendar-utils";

describe("getActiveMonths", () => {
  it("collects and sorts the month prefix of every dated key", () => {
    const stats = { "2024-06-12": 1, "2024-01-02": 3, "2024-06-30": 2 };
    expect(getActiveMonths(stats)).toEqual(["2024-01", "2024-06"]);
  });

  it("is empty when there is no data at all", () => {
    expect(getActiveMonths({})).toEqual([]);
  });
});

describe("findAdjacentActiveMonth", () => {
  const stats = { "2024-05-10": 1, "2024-08-01": 2, "2024-08-20": 1 };

  it("skips months without entries in both directions", () => {
    expect(findAdjacentActiveMonth("2024-06", stats, -1)).toBe("2024-05");
    expect(findAdjacentActiveMonth("2024-06", stats, 1)).toBe("2024-08");
    expect(findAdjacentActiveMonth("2024-05", stats, 1)).toBe("2024-08");
  });

  it("returns null at the ends so the caller stays put instead of looping", () => {
    expect(findAdjacentActiveMonth("2024-08", stats, 1)).toBeNull();
    expect(findAdjacentActiveMonth("2024-05", stats, -1)).toBeNull();
  });

  it("returns null in both directions when there is no data at all", () => {
    expect(findAdjacentActiveMonth("2026-01", {}, -1)).toBeNull();
    expect(findAdjacentActiveMonth("2026-01", {}, 1)).toBeNull();
  });

  it("only steps forward when every entry is in the future", () => {
    const futureOnly = { "2027-01-05": 1 };
    expect(findAdjacentActiveMonth("2026-05", futureOnly, -1)).toBeNull();
    expect(findAdjacentActiveMonth("2026-05", futureOnly, 1)).toBe("2027-01");
  });
});

describe("findNearestActiveMonth", () => {
  const stats = { "2024-05-10": 1, "2024-08-01": 2 };

  it("keeps the current month when it holds entries", () => {
    expect(findNearestActiveMonth("2024-08", stats)).toBe("2024-08");
  });

  it("falls back to the closest earlier month", () => {
    expect(findNearestActiveMonth("2024-07", stats)).toBe("2024-05");
    expect(findNearestActiveMonth("2024-06", stats)).toBe("2024-05");
  });

  it("reaches forward when every entry is later than the current month", () => {
    expect(findNearestActiveMonth("2023-01", stats)).toBe("2024-05");
  });

  it("returns null with no data so the visible month stays put", () => {
    expect(findNearestActiveMonth("2026-01", {})).toBeNull();
  });
});
