import { describe, expect, it } from "vitest";
import { addDays, daysBetween, lastWeekdayOnOrBefore, shortDayName, todayIso, weekdayOf } from "@/lib/dates";

describe("dates", () => {
  it("formats today in local time", () => {
    expect(todayIso(new Date(2026, 8, 25, 23, 59))).toBe("2026-09-25");
    expect(todayIso(new Date(2026, 0, 5, 0, 1))).toBe("2026-01-05");
  });

  it("adds days across months, years, and daylight-saving changes", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-11-01", 1)).toBe("2026-11-02"); // US DST ends Nov 1, 2026
    expect(addDays("2026-03-08", -1)).toBe("2026-03-07"); // US DST starts Mar 8, 2026
  });

  it("counts whole days between dates", () => {
    expect(daysBetween("2026-09-25", "2026-10-02")).toBe(7);
    expect(daysBetween("2026-10-02", "2026-09-25")).toBe(-7);
  });

  it("knows the weekday", () => {
    expect(weekdayOf("2026-09-25")).toBe("fri");
    expect(shortDayName("2026-09-27")).toBe("Sun");
  });

  it("finds the last shopping day on or before today", () => {
    expect(lastWeekdayOnOrBefore("2026-09-25", "sun")).toBe("2026-09-20"); // Fri → previous Sun
    expect(lastWeekdayOnOrBefore("2026-09-27", "sun")).toBe("2026-09-27"); // Sunday itself
    expect(lastWeekdayOnOrBefore("2026-09-25", "fri")).toBe("2026-09-25");
  });
});
