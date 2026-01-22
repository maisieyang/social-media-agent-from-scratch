import { z } from "zod";
import { getDefaultChatModel } from "../../llm.js";

const RELEVANCY_SCHEMA = z
  .object({
    reasoning: z
      .string()
      .describe(
        "Reasoning for why the webpage is or isn't relevant to your company's products."
      ),
    relevant: z
      .boolean()
      .describe(
        "Whether or not the webpage is relevant to your company's products."
      ),
  })
  .describe("The relevancy of the content to your company's products.");

/**
 * Verifies if the content provided is relevant based on the provided system prompt.
 *
 * @param content - The content to verify
 * @param args - Arguments containing the system prompt and relevancy schema
 * @returns A boolean indicating whether the content is relevant
 */
export async function verifyContentIsRelevant(
  content: string,
  args: {
    systemPrompt: string;
    schema: z.ZodType<z.infer<typeof RELEVANCY_SCHEMA>>;
  }
): Promise<boolean> {
  const relevancyModel = getDefaultChatModel({
    temperature: 0,
  }).withStructuredOutput(args.schema, {
    name: "relevancy",
  });

  const { relevant } = await relevancyModel.invoke([
    {
      role: "system",
      content: args.systemPrompt,
    },
    {
      role: "user",
      content: content,
    },
  ]);

  return relevant;
}
