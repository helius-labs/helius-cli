import chalk from "chalk";
import ora from "ora";
import { listProjects } from "../lib/api.js";
import { getJwt } from "../lib/config.js";

export async function projectsCommand(): Promise<void> {
  const spinner = ora();

  try {
    const jwt = getJwt();
    if (!jwt) {
      console.log(
        chalk.red("Not logged in. Run `helius signup -k <keypair>` to create an account, or `helius login` if you already have one.")
      );
      process.exit(1);
    }

    spinner.start("Fetching projects...");
    const projects = await listProjects(jwt);
    spinner.stop();

    if (projects.length === 0) {
      console.log(chalk.yellow("No projects found."));
      console.log(chalk.gray("Run `helius signup -k <keypair>` to create your first project."));
      return;
    }

    console.log(chalk.bold("\nProjects:\n"));
    console.log(
      chalk.gray("ID".padEnd(40)) +
      chalk.gray("Name".padEnd(25)) +
      chalk.gray("Plan".padEnd(10)) +
      chalk.gray("Created")
    );
    console.log(chalk.gray("-".repeat(95)));

    for (const project of projects) {
      const createdAt = project.createdAt
        ? new Date(project.createdAt).toLocaleDateString()
        : "N/A";
      const plan = project.subscription?.plan || "N/A";

      console.log(
        chalk.cyan(project.id.padEnd(40)) +
        (project.name || "Unnamed").padEnd(25) +
        plan.padEnd(10) +
        createdAt
      );
    }

    console.log(
      `\n${chalk.gray(`Total: ${projects.length} project(s)`)}`
    );
  } catch (error) {
    spinner.fail(
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}
