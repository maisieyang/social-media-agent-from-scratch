import { Octokit } from "@octokit/rest";

interface RepoContent {
  name: string;
  type: "file" | "dir";
  path: string;
  size?: number;
}

interface FileContent {
  content: string;
  type: "file";
  encoding: string;
  size: number;
  path: string;
  sha: string;
  name: string;
  url: string;
  git_url: string | null;
  html_url: string | null;
  download_url: string | null;
}

function getOctokit(): Octokit {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN environment variable is required");
  }
  return new Octokit({ auth: token });
}

/**
 * Extracts owner and repo from a GitHub URL
 */
export function getOwnerRepoFromUrl(repoUrl: string): {
  owner: string;
  repo: string;
} {
  const url = new URL(repoUrl);

  if (url.hostname !== "github.com") {
    throw new Error("URL must be a GitHub repository URL");
  }

  const pathSegments = url.pathname.slice(1).split("/");

  if (pathSegments.length < 2) {
    throw new Error(
      "Invalid GitHub repository URL: missing owner or repository name"
    );
  }

  const [owner, repo] = pathSegments;
  const cleanRepo = repo.replace(".git", "");

  return { owner, repo: cleanRepo };
}

/**
 * Fetches the contents of a GitHub repository's root directory
 */
export async function getRepoContents(repoUrl: string): Promise<RepoContent[]> {
  const octokit = getOctokit();
  const { owner, repo } = getOwnerRepoFromUrl(repoUrl);

  try {
    const response = await octokit.repos.getContent({
      owner,
      repo,
      path: "",
    });

    if (!Array.isArray(response.data)) {
      throw new Error("Unexpected API response format");
    }

    return response.data.map((item) => ({
      name: item.name,
      type: item.type as "file" | "dir",
      path: item.path,
      size: item.size,
    }));
  } catch (error) {
    throw new Error(
      `Failed to fetch repository contents for ${repoUrl}: ${error}`
    );
  }
}

/**
 * Gets the contents of a specific file in a GitHub repository
 */
export async function getFileContents(
  repoUrl: string,
  filePath: string
): Promise<FileContent> {
  const octokit = getOctokit();
  const { owner, repo } = getOwnerRepoFromUrl(repoUrl);

  const normalizedPath = filePath.split("?")[0].replace(/^\/+|\/+$/g, "");

  try {
    const response = await octokit.repos.getContent({
      owner,
      repo,
      path: normalizedPath,
    });

    if (Array.isArray(response.data)) {
      throw new Error(
        `Path '${normalizedPath}' points to a directory, not a file`
      );
    }

    if (response.data.type !== "file") {
      throw new Error(
        `Path '${normalizedPath}' is not a regular file (type: ${response.data.type})`
      );
    }

    const content = response.data.content
      ? Buffer.from(response.data.content, "base64").toString("utf-8")
      : "";

    return {
      content,
      type: response.data.type,
      encoding: response.data.encoding,
      size: response.data.size,
      path: response.data.path,
      sha: response.data.sha,
      name: response.data.name,
      url: response.data.url,
      git_url: response.data.git_url,
      html_url: response.data.html_url,
      download_url: response.data.download_url,
    };
  } catch (error) {
    throw new Error(`Failed to fetch file contents: ${error}`);
  }
}

/**
 * Gets the contents of a specific directory in a GitHub repository
 */
export async function getDirectoryContents(
  repoUrl: string,
  directoryPath: string
): Promise<RepoContent[]> {
  const octokit = getOctokit();
  const { owner, repo } = getOwnerRepoFromUrl(repoUrl);

  const normalizedPath = directoryPath.replace(/^\/+|\/+$/g, "");

  try {
    const response = await octokit.repos.getContent({
      owner,
      repo,
      path: normalizedPath,
    });

    if (!Array.isArray(response.data)) {
      throw new Error(`Path '${normalizedPath}' does not point to a directory`);
    }

    return response.data.map((item) => ({
      name: item.name,
      type: item.type as "file" | "dir",
      path: item.path,
      size: item.size,
    }));
  } catch (error) {
    throw new Error(`Failed to fetch directory contents: ${error}`);
  }
}
