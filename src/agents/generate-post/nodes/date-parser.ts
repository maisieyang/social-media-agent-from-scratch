import { DateType } from "../../types.js";
import { ALLOWED_DAYS } from "../constants.js";

/**
 * Priority date patterns
 */
const PRIORITY_PATTERNS: Record<string, DateType> = {
  p1: "p1",
  p2: "p2",
  p3: "p3",
  r1: "r1",
  r2: "r2",
  r3: "r3",
  priority1: "p1",
  priority2: "p2",
  priority3: "p3",
  regular1: "r1",
  regular2: "r2",
  regular3: "r3",
};

/**
 * Day name to number mapping
 */
const DAY_MAP: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

/**
 * Parse time string to hours and minutes
 * Supports formats: "8:00 AM", "14:00", "2pm", "2:30pm"
 */
export function parseTime(timeStr: string): { hours: number; minutes: number } | null {
  const cleanTime = timeStr.trim().toLowerCase();

  // Try 12-hour format: "8:00 AM" or "8:30am" or "8am"
  const time12Match = cleanTime.match(
    /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i
  );
  if (time12Match) {
    let hours = parseInt(time12Match[1], 10);
    const minutes = time12Match[2] ? parseInt(time12Match[2], 10) : 0;
    const isPM = time12Match[3].toLowerCase() === "pm";

    if (hours === 12) {
      hours = isPM ? 12 : 0;
    } else if (isPM) {
      hours += 12;
    }

    return { hours, minutes };
  }

  // Try 24-hour format: "14:00" or "14:30"
  const time24Match = cleanTime.match(/^(\d{1,2}):(\d{2})$/);
  if (time24Match) {
    return {
      hours: parseInt(time24Match[1], 10),
      minutes: parseInt(time24Match[2], 10),
    };
  }

  return null;
}

/**
 * Parse relative date expressions
 * Supports: "today", "tomorrow", "next monday", "in 3 days"
 */
export function parseRelativeDate(dateStr: string): Date | null {
  const cleanDate = dateStr.trim().toLowerCase();
  const now = new Date();

  if (cleanDate === "today") {
    return now;
  }

  if (cleanDate === "tomorrow") {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }

  // "next monday", "next tuesday", etc.
  const nextDayMatch = cleanDate.match(/^next\s+(\w+)$/);
  if (nextDayMatch) {
    const dayName = nextDayMatch[1].toLowerCase();
    const targetDay = DAY_MAP[dayName];
    if (targetDay !== undefined) {
      const result = new Date(now);
      const currentDay = now.getDay();
      let daysToAdd = targetDay - currentDay;
      if (daysToAdd <= 0) {
        daysToAdd += 7;
      }
      result.setDate(result.getDate() + daysToAdd);
      return result;
    }
  }

  // "in 3 days", "in 1 week"
  const inDaysMatch = cleanDate.match(/^in\s+(\d+)\s+(day|days|week|weeks)$/);
  if (inDaysMatch) {
    const num = parseInt(inDaysMatch[1], 10);
    const unit = inDaysMatch[2];
    const result = new Date(now);
    if (unit.startsWith("week")) {
      result.setDate(result.getDate() + num * 7);
    } else {
      result.setDate(result.getDate() + num);
    }
    return result;
  }

  // Day name only: "monday", "tuesday"
  if (DAY_MAP[cleanDate] !== undefined) {
    const targetDay = DAY_MAP[cleanDate];
    const result = new Date(now);
    const currentDay = now.getDay();
    let daysToAdd = targetDay - currentDay;
    if (daysToAdd <= 0) {
      daysToAdd += 7;
    }
    result.setDate(result.getDate() + daysToAdd);
    return result;
  }

  return null;
}

/**
 * Parse absolute date string
 * Supports: "2024-01-15", "01/15/2024", "January 15, 2024"
 */
export function parseAbsoluteDate(dateStr: string): Date | null {
  const cleanDate = dateStr.trim();

  // Try ISO format: "2024-01-15"
  const isoMatch = cleanDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const date = new Date(
      parseInt(isoMatch[1], 10),
      parseInt(isoMatch[2], 10) - 1,
      parseInt(isoMatch[3], 10)
    );
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // Try US format: "01/15/2024" or "1/15/24"
  const usMatch = cleanDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (usMatch) {
    let year = parseInt(usMatch[3], 10);
    if (year < 100) {
      year += 2000;
    }
    const date = new Date(
      year,
      parseInt(usMatch[1], 10) - 1,
      parseInt(usMatch[2], 10)
    );
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // Try natural format: "January 15, 2024" or "Jan 15 2024"
  const parsed = Date.parse(cleanDate);
  if (!isNaN(parsed)) {
    return new Date(parsed);
  }

  return null;
}

/**
 * Result of date parsing
 */
export interface ParsedDateResult {
  success: boolean;
  date?: DateType;
  error?: string;
}

/**
 * Parse a user-provided date string into a DateType
 *
 * Supports multiple formats:
 * - Priority slots: "p1", "p2", "p3", "r1", "r2", "r3"
 * - Relative dates: "today", "tomorrow", "next monday", "in 3 days"
 * - Absolute dates: "2024-01-15", "01/15/2024", "January 15, 2024"
 * - Date with time: "tomorrow at 2pm", "2024-01-15 14:00"
 *
 * @param input - User input string
 * @returns ParsedDateResult with the parsed date or error
 */
export function parseScheduleDate(input: string): ParsedDateResult {
  const cleanInput = input.trim().toLowerCase();

  // Check for empty input
  if (!cleanInput) {
    return { success: false, error: "Empty date input" };
  }

  // Check for priority/regular slots
  if (PRIORITY_PATTERNS[cleanInput]) {
    return { success: true, date: PRIORITY_PATTERNS[cleanInput] };
  }

  // Try to split date and time
  let datePart = cleanInput;
  let timePart: string | null = null;

  // Check for "at" separator: "tomorrow at 2pm"
  const atMatch = cleanInput.match(/^(.+?)\s+at\s+(.+)$/);
  if (atMatch) {
    datePart = atMatch[1].trim();
    timePart = atMatch[2].trim();
  } else {
    // Check for time at the end: "2024-01-15 14:00"
    const timeEndMatch = cleanInput.match(
      /^(.+?)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?|\d{1,2}:\d{2})$/i
    );
    if (timeEndMatch) {
      datePart = timeEndMatch[1].trim();
      timePart = timeEndMatch[2].trim();
    }
  }

  // Parse the date part
  let date = parseRelativeDate(datePart);
  if (!date) {
    date = parseAbsoluteDate(datePart);
  }

  if (!date) {
    return {
      success: false,
      error: `Unable to parse date: "${input}". Try formats like "tomorrow", "next monday", "p1", or "2024-01-15"`,
    };
  }

  // Parse and apply time if provided
  if (timePart) {
    const time = parseTime(timePart);
    if (time) {
      date.setHours(time.hours, time.minutes, 0, 0);
    }
  } else {
    // Default to 9:00 AM if no time specified
    date.setHours(9, 0, 0, 0);
  }

  return { success: true, date };
}

/**
 * Format a DateType for display
 */
export function formatDateType(date: DateType): string {
  if (typeof date === "string") {
    const slotNames: Record<string, string> = {
      p1: "Priority 1 (highest)",
      p2: "Priority 2",
      p3: "Priority 3",
      r1: "Regular slot 1",
      r2: "Regular slot 2",
      r3: "Regular slot 3",
    };
    return slotNames[date] || date;
  }

  return date.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Validate that a date is in the future and within allowed times
 */
export function validateScheduleDate(date: DateType): {
  valid: boolean;
  error?: string;
} {
  // Priority slots are always valid
  if (typeof date === "string") {
    return { valid: true };
  }

  const now = new Date();
  if (date < now) {
    return { valid: false, error: "Schedule date must be in the future" };
  }

  // Check if the day is allowed
  const dayName = ALLOWED_DAYS[date.getDay()];
  if (!ALLOWED_DAYS.includes(dayName)) {
    return { valid: false, error: `Posting not allowed on ${dayName}` };
  }

  // Check if the time is within allowed hours (8 AM - 5 PM)
  const hours = date.getHours();
  if (hours < 8 || hours >= 17) {
    return {
      valid: false,
      error: "Posting only allowed between 8:00 AM and 5:00 PM",
    };
  }

  return { valid: true };
}
