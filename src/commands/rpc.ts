import chalk from "chalk";
import ora from "ora";
import { listProjects } from "../lib/api.js";
import { getJwt } from "../lib/config.js";

export async function rpcCommand(projectId?: string): Promise<void> {
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
      process.exit(1);
    }

    // If no project ID provided, try to get the only project
    let project;
    if (!projectId) {
      if (projects.length > 1) {
        console.log(
          chalk.yellow(
            "Multiple projects found. Please specify a project ID."
          )
        );
        console.log("\nAvailable projects:");
        for (const p of projects) {
          console.log(`  ${chalk.cyan(p.id)} - ${p.name || "Unnamed"}`);
        }
        process.exit(1);
      }
      project = projects[0];
    } else {
      project = projects.find(p => p.id === projectId);
      if (!project) {
        console.log(chalk.red(`Project ${projectId} not found.`));
        process.exit(1);
      }
    }

    console.log(chalk.bold(`\nRPC Endpoints for project ${chalk.cyan(project.id)}:\n`));

    if (!project.dnsRecords || project.dnsRecords.length === 0) {
      console.log(chalk.yellow("No RPC endpoints configured."));
      return;
    }

    // Filter RPC records and group by network
    const rpcRecords = project.dnsRecords.filter(r => r.usageType === "rpc");

    if (rpcRecords.length === 0) {
      console.log(chalk.yellow("No RPC endpoints available."));
      return;
    }

    const mainnetRecords = rpcRecords.filter(r => r.network === "mainnet");
    const devnetRecords = rpcRecords.filter(r => r.network === "devnet");

    if (mainnetRecords.length > 0) {
      console.log(chalk.bold("Mainnet:"));
      for (const record of mainnetRecords) {
        console.log(`  ${chalk.blue("https://" + record.dns)}`);
      }
    }

    if (devnetRecords.length > 0) {
      if (mainnetRecords.length > 0) console.log();
      console.log(chalk.bold("Devnet:"));
      for (const record of devnetRecords) {
        console.log(`  ${chalk.blue("https://" + record.dns)}`);
      }
    }

    // Show any other networks
    const otherRecords = rpcRecords.filter(r => r.network !== "mainnet" && r.network !== "devnet");
    for (const record of otherRecords) {
      console.log(chalk.bold(`\n${record.network}:`));
      console.log(`  ${chalk.blue("https://" + record.dns)}`);
    }
  } catch (error) {
    spinner.fail(
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}
