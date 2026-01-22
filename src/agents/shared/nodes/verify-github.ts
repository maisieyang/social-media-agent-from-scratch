import { z } from "zod";
import { LangGraphRunnableConfig } from "@langchain/langgraph";
import { Octokit } from "@octokit/rest";
import { getPrompts } from "../../generate-post/prompts/index.js";
import { VerifyContentAnnotation } from "../shared-state.js";
import {
  getRepoContents,
  getFileContents,
  getOwnerRepoFromUrl,
} from "../../../utils/github-repo-contents.js";
import { verifyContentIsRelevant } from "./verify-content.js";
import { VerifyLinksResultAnnotation } from "../../generate-post/state.js";
import { SKIP_CONTENT_RELEVANCY_CHECK } from "../../generate-post/constants.js";

function getOctokit(): Octokit {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN environment variable is required");
  }
  return new Octokit({ auth: token });
}

type VerifyGitHubContentReturn = Partial<
  typeof VerifyLinksResultAnnotation.State
>;

const RELEVANCY_SCHEMA = z
  .object({
    reasoning: z
      .string()
      .describe(
        "Reasoning for why the content from the GitHub repository is or isn't relevant to your company's products."
      ),
    relevant: z
      .boolean()
      .describe(
        "Whether or not the content from the GitHub repository is relevant to your company's products."
      ),
  })
  .describe("The relevancy of the content to your company's products.");

const REPO_DEPENDENCY_PROMPT = `Here are the dependencies of the repository. You should use the dependencies listed to determine if the repository is relevant.
<repository-dependency-files>
{dependencyFiles}
</repository-dependency-files>`;

const VERIFY_RELEVANT_CONTENT_PROMPT = `You are a highly regarded marketing employee.
You're given a {file_type} from a GitHub repository and need to verify the repository implements relevant content.
You're doing this to ensure the content is relevant to your business context, and it can be used as marketing material.

${getPrompts().businessContext}

${getPrompts().contentValidationPrompt}

{repoDependenciesPrompt}

Given this context, examine the {file_type} closely, and determine if the repository implements relevant content.
You should provide reasoning as to why or why not the repository is relevant, then a simple true or false for whether or not it is relevant.`;

/**
 * Gets dependency files from a GitHub repository.
 */
async function getDependencies(
  githubUrl: string
): Promise<Array<{ fileContents: string; fileName: string }> | undefined> {
  try {
    const octokit = getOctokit();
    const { owner, repo } = getOwnerRepoFromUrl(githubUrl);

    const dependenciesCodeFileQuery = `filename:package.json OR filename:requirements.txt OR filename:pyproject.toml`;
    const dependenciesCodeFiles = await octokit.search.code({
      q: `${dependenciesCodeFileQuery} repo:${owner}/${repo}`,
      per_page: 5,
    });

    if (dependenciesCodeFiles.data.total_count === 0) {
      return undefined;
    }

    const fileContents = await Promise.all(
      dependenciesCodeFiles.data.items.map(async (item) => {
        try {
          const { data } = await octokit.repos.getContent({
            owner,
            repo,
            path: item.path,
          });

          if (!("content" in data)) {
            return undefined;
          }

          return {
            fileName: item.name,
            fileContents: Buffer.from(data.content, "base64").toString("utf-8"),
          };
        } catch {
          return undefined;
        }
      })
    );

    return fileContents.filter(
      (file): file is { fileName: string; fileContents: string } =>
        file !== undefined
    );
  } catch {
    return undefined;
  }
}

/**
 * Gets GitHub contents and type from a URL.
 */
export async function getGitHubContentsAndTypeFromUrl(
  url: string
): Promise<{ contents: string; fileType: string } | undefined> {
  try {
    const repoContents = await getRepoContents(url);
    const readmePath = repoContents.find(
      (c) =>
        c.name.toLowerCase() === "readme.md" ||
        c.name.toLowerCase() === "readme"
    )?.path;

    if (!readmePath) {
      return undefined;
    }

    const readmeContents = await getFileContents(url, readmePath);
    return {
      contents: readmeContents.content,
      fileType: "README file",
    };
  } catch {
    return undefined;
  }
}

/**
 * Verifies if GitHub content is relevant.
 */
async function verifyGitHubContentIsRelevant(params: {
  contents: string;
  fileType: string;
  dependencyFiles: Array<{ fileContents: string; fileName: string }> | undefined;
}): Promise<boolean> {
  let dependenciesPrompt = "";
  if (params.dependencyFiles) {
    params.dependencyFiles.forEach((f) => {
      dependenciesPrompt += `\`\`\`${f.fileName}\n${f.fileContents}\n\`\`\`\n`;
    });
    dependenciesPrompt = REPO_DEPENDENCY_PROMPT.replace(
      "{dependencyFiles}",
      dependenciesPrompt
    );
  }

  const systemPrompt = VERIFY_RELEVANT_CONTENT_PROMPT.replaceAll(
    "{file_type}",
    params.fileType
  ).replaceAll("{repoDependenciesPrompt}", dependenciesPrompt);

  return verifyContentIsRelevant(params.contents, {
    systemPrompt,
    schema: RELEVANCY_SCHEMA,
  });
}

/**
 * Checks if content relevancy check should be skipped.
 */
function skipContentRelevancyCheck(
  configurable?: Record<string, unknown>
): boolean {
  const skipRelevancyCheck = configurable?.[SKIP_CONTENT_RELEVANCY_CHECK];
  return !!(
    skipRelevancyCheck ?? process.env.SKIP_CONTENT_RELEVANCY_CHECK === "true"
  );
}

/**
 * Verifies GitHub content is relevant.
 */
export async function verifyGitHubContent(
  state: typeof VerifyContentAnnotation.State,
  config: LangGraphRunnableConfig
): Promise<VerifyGitHubContentReturn> {
  console.log("Verifying GitHub content for:", state.link);

  try {
    const contentsAndType = await getGitHubContentsAndTypeFromUrl(state.link);
    if (!contentsAndType) {
      console.warn("No contents found for GitHub URL:", state.link);
      return {
        relevantLinks: [],
        pageContents: [],
      };
    }

    const returnValue: VerifyGitHubContentReturn = {
      relevantLinks: [state.link],
      pageContents: [contentsAndType.contents],
    };

    if (skipContentRelevancyCheck(config.configurable)) {
      console.log("Skipping content relevancy check for:", state.link);
      return returnValue;
    }

    const dependencyFiles = await getDependencies(state.link);
    const isRelevant = await verifyGitHubContentIsRelevant({
      contents: contentsAndType.contents,
      fileType: contentsAndType.fileType,
      dependencyFiles,
    });

    if (isRelevant) {
      console.log("GitHub content is relevant:", state.link);
      return returnValue;
    }

    console.log("GitHub content is not relevant:", state.link);
    return {
      relevantLinks: [],
      pageContents: [],
    };
  } catch (error) {
    console.error("Error verifying GitHub content:", error);
    return {
      relevantLinks: [],
      pageContents: [],
    };
  }
}
