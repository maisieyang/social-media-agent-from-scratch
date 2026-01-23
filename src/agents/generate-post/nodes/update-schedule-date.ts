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

/**
 * Schedule Post Node (placeholder)
 *
 * This node would handle the actual scheduling/posting logic.
 * For now, it just logs and returns the final state.
 */
export async function schedulePost(
  state: GeneratePostState
): Promise<GeneratePostUpdate> {
  const { post, scheduleDate, image, relevantLinks, links } = state;

  const linksToUse =
    relevantLinks && relevantLinks.length > 0 ? relevantLinks : links;
  const primaryLink = linksToUse[0] || "";

  console.log("=".repeat(50));
  console.log("POST APPROVED FOR SCHEDULING");
  console.log("=".repeat(50));
  console.log("\nPost content:");
  console.log("-".repeat(40));
  console.log(post);
  console.log("-".repeat(40));
  console.log(`\nCharacter count: ${post?.length || 0}`);
  console.log(`Source link: ${primaryLink}`);
  console.log(`Image: ${image ? image.imageUrl : "None"}`);
  console.log(
    `Scheduled for: ${scheduleDate ? formatDateType(scheduleDate) : "Not specified"}`
  );
  console.log("=".repeat(50));

  // In a real implementation, this would:
  // 1. Store the post in a database
  // 2. Set up the scheduled job
  // 3. Return confirmation

  return {
    // Clear navigation
    next: undefined,
    userResponse: undefined,
  };
}
