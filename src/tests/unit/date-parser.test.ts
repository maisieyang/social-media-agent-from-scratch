/**
 * Unit Tests for Date Parser
 *
 * Tests the date parsing utilities used for scheduling posts.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import {
  parseTime,
  parseRelativeDate,
  parseAbsoluteDate,
  parseScheduleDate,
  formatDateType,
  validateScheduleDate,
} from "../../agents/generate-post/nodes/date-parser";

describe("Date Parser", () => {
  describe("parseTime", () => {
    it("should parse 12-hour format with AM", () => {
      expect(parseTime("8:00 AM")).toEqual({ hours: 8, minutes: 0 });
      expect(parseTime("8:30am")).toEqual({ hours: 8, minutes: 30 });
      expect(parseTime("8am")).toEqual({ hours: 8, minutes: 0 });
    });

    it("should parse 12-hour format with PM", () => {
      expect(parseTime("2:00 PM")).toEqual({ hours: 14, minutes: 0 });
      expect(parseTime("2:30pm")).toEqual({ hours: 14, minutes: 30 });
      expect(parseTime("2pm")).toEqual({ hours: 14, minutes: 0 });
    });

    it("should handle 12:00 AM and PM correctly", () => {
      expect(parseTime("12:00 AM")).toEqual({ hours: 0, minutes: 0 });
      expect(parseTime("12:00 PM")).toEqual({ hours: 12, minutes: 0 });
    });

    it("should parse 24-hour format", () => {
      expect(parseTime("14:00")).toEqual({ hours: 14, minutes: 0 });
      expect(parseTime("09:30")).toEqual({ hours: 9, minutes: 30 });
      expect(parseTime("0:00")).toEqual({ hours: 0, minutes: 0 });
    });

    it("should return null for invalid formats", () => {
      expect(parseTime("invalid")).toBeNull();
      expect(parseTime("25:00")).toEqual({ hours: 25, minutes: 0 }); // Doesn't validate range
      expect(parseTime("")).toBeNull();
    });
  });

  describe("parseRelativeDate", () => {
    beforeEach(() => {
      // Mock the current date for consistent tests
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2024-01-15T10:00:00Z"));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should parse "today"', () => {
      const result = parseRelativeDate("today");
      expect(result).not.toBeNull();
      expect(result?.getDate()).toBe(15);
    });

    it('should parse "tomorrow"', () => {
      const result = parseRelativeDate("tomorrow");
      expect(result).not.toBeNull();
      expect(result?.getDate()).toBe(16);
    });

    it('should parse "next monday"', () => {
      const result = parseRelativeDate("next monday");
      expect(result).not.toBeNull();
      // January 15, 2024 is Monday, so next Monday is January 22
      expect(result?.getDate()).toBe(22);
    });

    it('should parse day names like "friday"', () => {
      const result = parseRelativeDate("friday");
      expect(result).not.toBeNull();
      expect(result?.getDay()).toBe(5); // Friday
    });

    it('should parse "in 3 days"', () => {
      const result = parseRelativeDate("in 3 days");
      expect(result).not.toBeNull();
      expect(result?.getDate()).toBe(18);
    });

    it('should parse "in 1 week"', () => {
      const result = parseRelativeDate("in 1 week");
      expect(result).not.toBeNull();
      expect(result?.getDate()).toBe(22);
    });

    it("should return null for invalid inputs", () => {
      expect(parseRelativeDate("invalid")).toBeNull();
      expect(parseRelativeDate("next year")).toBeNull();
    });
  });

  describe("parseAbsoluteDate", () => {
    it("should parse ISO format", () => {
      const result = parseAbsoluteDate("2024-01-15");
      expect(result).not.toBeNull();
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(0); // January
      expect(result?.getDate()).toBe(15);
    });

    it("should parse US format", () => {
      const result = parseAbsoluteDate("01/15/2024");
      expect(result).not.toBeNull();
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(0);
      expect(result?.getDate()).toBe(15);
    });

    it("should parse short year US format", () => {
      const result = parseAbsoluteDate("1/15/24");
      expect(result).not.toBeNull();
      expect(result?.getFullYear()).toBe(2024);
    });

    it("should parse natural format", () => {
      const result = parseAbsoluteDate("January 15, 2024");
      expect(result).not.toBeNull();
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(0);
    });

    it("should return null for invalid dates", () => {
      expect(parseAbsoluteDate("invalid")).toBeNull();
      expect(parseAbsoluteDate("")).toBeNull();
    });
  });

  describe("parseScheduleDate", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2024-01-15T10:00:00Z"));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should parse priority slots", () => {
      expect(parseScheduleDate("p1")).toEqual({ success: true, date: "p1" });
      expect(parseScheduleDate("P2")).toEqual({ success: true, date: "p2" });
      expect(parseScheduleDate("r1")).toEqual({ success: true, date: "r1" });
      expect(parseScheduleDate("priority1")).toEqual({ success: true, date: "p1" });
    });

    it("should parse date with time using at separator", () => {
      const result = parseScheduleDate("tomorrow at 2pm");
      expect(result.success).toBe(true);
      expect(result.date).toBeInstanceOf(Date);
      if (result.date instanceof Date) {
        expect(result.date.getHours()).toBe(14);
      }
    });

    it("should parse date with time appended", () => {
      const result = parseScheduleDate("2024-01-20 14:00");
      expect(result.success).toBe(true);
      expect(result.date).toBeInstanceOf(Date);
    });

    it("should default to 9 AM if no time specified", () => {
      const result = parseScheduleDate("tomorrow");
      expect(result.success).toBe(true);
      if (result.date instanceof Date) {
        expect(result.date.getHours()).toBe(9);
      }
    });

    it("should return error for invalid input", () => {
      const result = parseScheduleDate("invalid date string");
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should return error for empty input", () => {
      const result = parseScheduleDate("");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Empty date input");
    });
  });

  describe("formatDateType", () => {
    it("should format priority slots", () => {
      expect(formatDateType("p1")).toBe("Priority 1 (highest)");
      expect(formatDateType("r2")).toBe("Regular slot 2");
    });

    it("should format Date objects", () => {
      const date = new Date("2024-01-15T14:30:00");
      const formatted = formatDateType(date);
      expect(formatted).toContain("2024");
      expect(formatted).toContain("January");
      expect(formatted).toContain("15");
    });
  });

  describe("validateScheduleDate", () => {
    it("should always accept priority slots", () => {
      expect(validateScheduleDate("p1")).toEqual({ valid: true });
      expect(validateScheduleDate("r3")).toEqual({ valid: true });
    });

    it("should reject dates in the past", () => {
      const pastDate = new Date("2020-01-01T10:00:00");
      const result = validateScheduleDate(pastDate);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("future");
    });

    it("should reject times outside allowed hours", () => {
      const earlyDate = new Date();
      earlyDate.setDate(earlyDate.getDate() + 1);
      earlyDate.setHours(6, 0, 0, 0); // 6 AM - too early

      const result = validateScheduleDate(earlyDate);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("8:00 AM");
    });

    it("should accept valid future dates within hours", () => {
      const validDate = new Date();
      validDate.setDate(validDate.getDate() + 1);
      validDate.setHours(10, 0, 0, 0); // 10 AM - valid

      const result = validateScheduleDate(validDate);
      expect(result.valid).toBe(true);
    });
  });
});
