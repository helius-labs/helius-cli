import chalk from "chalk";
import ora from "ora";
import { getProject, listProjects, createApiKey } from "../lib/api.js";
import { getJwt } from "../lib/config.js";

async function resolveProjectId(jwt: string, projectId?: string): Promise<string> {
  if (projectId) {
    return projectId;
  }

  const projects = await listProjects(jwt);

  if (projects.length === 0) {
    throw new Error("No projects found. Run `helius signup -k <keypair>` to create your first project.");
  }

  if (projects.length > 1) {
    console.log(
      chalk.yellow("Multiple projects found. Please specify a project ID.")
    );
    console.log("\nAvailable projects:");
    for (const p of projects) {
      console.log(`  ${chalk.cyan(p.id)} - ${p.name || "Unnamed"}`);
    }
    process.exit(1);
  }

  return projects[0].id;
}

export async function apikeysCommand(projectId?: string): Promise<void> {
  const spinner = ora();

  try {
    const jwt = getJwt();
    if (!jwt) {
      console.log(
        chalk.red("Not logged in. Run `helius signup -k <keypair>` to create an account, or `helius login` if you already have one.")
      );
      process.exit(1);
    }

    spinner.start("Fetching API keys...");
    const id = await resolveProjectId(jwt, projectId);
    const project = await getProject(jwt, id);
    spinner.stop();

    if (!project.apiKeys || project.apiKeys.length === 0) {
      console.log(chalk.yellow("No API keys found for this project."));
      return;
    }

    console.log(chalk.bold(`\nAPI Keys for project ${chalk.cyan(id)}:\n`));
    console.log(
      chalk.gray("Key ID".padEnd(40)) +
      chalk.gray("Name".padEnd(20)) +
      chalk.gray("Plan".padEnd(10)) +
      chalk.gray("Created")
    );
    console.log(chalk.gray("-".repeat(90)));

    for (const key of project.apiKeys) {
      const createdAt = key.createdAt
        ? new Date(key.createdAt).toLocaleDateString()
        : "N/A";
      console.log(
        chalk.cyan(key.keyId.padEnd(40)) +
        (key.keyName || "Unnamed").padEnd(20) +
        (key.usagePlan || "N/A").padEnd(10) +
        createdAt
      );
    }

    console.log(
      `\n${chalk.gray(`Total: ${project.apiKeys.length} API key(s)`)}`
    );
  } catch (error) {
    spinner.fail(
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

export async function createApiKeyCommand(projectId?: string): Promise<void> {
  const spinner = ora();

  try {
    const jwt = getJwt();
    if (!jwt) {
      console.log(
        chalk.red("Not logged in. Run `helius signup -k <keypair>` to create an account, or `helius login` if you already have one.")
      );
      process.exit(1);
    }

    // Get wallet address from the first project's users (the owner)
    spinner.start("Resolving project and wallet...");
    const projects = await listProjects(jwt);

    if (projects.length === 0) {
      spinner.fail("No projects found.");
      process.exit(1);
    }

    const id = projectId || projects[0].id;
    const project = projects.find(p => p.id === id);

    if (!project) {
      spinner.fail(`Project ${id} not found.`);
      process.exit(1);
    }

    // Get wallet address from the project users (the owner)
    const owner = project.users?.find(u => u.role === "Owner");
    const walletAddress = owner?.id;

    if (!walletAddress) {
      spinner.fail("Could not determine wallet address from project.");
      process.exit(1);
    }

    spinner.text = "Creating API key...";
    const apiKey = await createApiKey(jwt, id, walletAddress);
    spinner.succeed("API key created");

    console.log(`\nKey ID: ${chalk.cyan(apiKey.keyId)}`);
    if (apiKey.keyName) {
      console.log(`Name:   ${apiKey.keyName}`);
    }
    console.log(`Plan:   ${apiKey.usagePlan || "N/A"}`);
  } catch (error) {
    spinner.fail(
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}
