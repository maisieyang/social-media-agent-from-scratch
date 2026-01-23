import { GeneratePostState, GeneratePostUpdate } from "../state.js";
import {
  parseScheduleDate,
  validateScheduleDate,
  formatDateType,
} from "./date-parser.js";

/**
 * Update Schedule Date Node
 *
 * Parses and validates a new schedule date from user input.
 * Updates the scheduleDate in state if valid.
 */
export async function updateScheduleDate(
  state: GeneratePostState
): Promise<GeneratePostUpdate> {
  const { userResponse } = state;

  // If no new date provided, keep current
  if (!userResponse) {
    console.log("No schedule date update provided");
    return {
      userResponse: undefined,
    };
  }

  console.log(`Parsing schedule date: "${userResponse}"`);

  // Parse the date input
  const parseResult = parseScheduleDate(userResponse);

  if (!parseResult.success || !parseResult.date) {
    console.error("Failed to parse schedule date:", parseResult.error);
    // Keep current date on parse failure
    return {
      userResponse: `Error: ${parseResult.error}`,
    };
  }

  // Validate the parsed date
  const validationResult = validateScheduleDate(parseResult.date);

  if (!validationResult.valid) {
    console.error("Invalid schedule date:", validationResult.error);
    return {
      userResponse: `Error: ${validationResult.error}`,
    };
  }

  const formattedDate = formatDateType(parseResult.date);
  console.log(`Schedule date updated to: ${formattedDate}`);

  return {
    scheduleDate: parseResult.date,
    userResponse: undefined,
  };
}
