import chalk from "chalk";
import ora from "ora";
import { getProject, listProjects } from "../lib/api.js";
import { getJwt } from "../lib/config.js";

export async function projectCommand(projectId?: string): Promise<void> {
  const spinner = ora();

  try {
    const jwt = getJwt();
    if (!jwt) {
      console.log(
        chalk.red("Not logged in. Run `helius signup -k <keypair>` to create an account, or `helius login` if you already have one.")
      );
      process.exit(1);
    }

    // If no project ID provided, try to get the only project
    let id = projectId;
    let projectListItem;
    if (!id) {
      spinner.start("Fetching projects...");
      const projects = await listProjects(jwt);
      spinner.stop();

      if (projects.length === 0) {
        console.log(chalk.yellow("No projects found."));
        console.log(chalk.gray("Run `helius signup -k <keypair>` to create your first project."));
        process.exit(1);
      }

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

      id = projects[0].id;
      projectListItem = projects[0];
    } else {
      // Get list item for metadata
      spinner.start("Fetching projects...");
      const projects = await listProjects(jwt);
      projectListItem = projects.find(p => p.id === id);
      spinner.stop();
    }

    spinner.start("Fetching project details...");
    const projectDetails = await getProject(jwt, id);
    spinner.stop();

    console.log(chalk.bold("\nProject Details:\n"));
    console.log(`${chalk.gray("ID:")}          ${chalk.cyan(id)}`);
    console.log(`${chalk.gray("Name:")}        ${projectListItem?.name || "Unnamed"}`);
    console.log(`${chalk.gray("Created:")}     ${projectListItem?.createdAt ? new Date(projectListItem.createdAt).toLocaleString() : "N/A"}`);

    // Subscription info
    if (projectListItem?.subscription) {
      console.log(chalk.bold("\nSubscription:"));
      console.log(`  ${chalk.gray("Plan:")}        ${projectListItem.subscription.plan}`);
      console.log(`  ${chalk.gray("Period:")}      ${projectListItem.subscription.billingPeriodStart?.split('T')[0] || 'N/A'} - ${projectListItem.subscription.billingPeriodEnd?.split('T')[0] || 'N/A'}`);
    }

    // API Keys
    if (projectDetails.apiKeys && projectDetails.apiKeys.length > 0) {
      console.log(chalk.bold("\nAPI Keys:"));
      for (const key of projectDetails.apiKeys) {
        console.log(`  ${chalk.cyan(key.keyId)} - ${key.keyName || "Unnamed"} (${key.usagePlan})`);
      }
    }

    // Credits Usage
    if (projectDetails.creditsUsage) {
      const usage = projectDetails.creditsUsage;
      console.log(chalk.bold("\nCredits Usage:"));
      console.log(`  ${chalk.gray("Total Used:")}        ${chalk.yellow(usage.totalCreditsUsed.toLocaleString())}`);
      console.log(`  ${chalk.gray("Remaining:")}         ${chalk.green(usage.remainingCredits.toLocaleString())}`);
      console.log(`  ${chalk.gray("API Usage:")}         ${usage.apiUsage.toLocaleString()}`);
      console.log(`  ${chalk.gray("RPC Usage:")}         ${usage.rpcUsage.toLocaleString()}`);
      console.log(`  ${chalk.gray("Webhook Usage:")}     ${usage.webhookUsage.toLocaleString()}`);
    }

    // Billing Cycle
    if (projectDetails.billingCycle) {
      console.log(chalk.bold("\nBilling Cycle:"));
      console.log(`  ${projectDetails.billingCycle.start} to ${projectDetails.billingCycle.end}`);
    }

    // RPC Endpoints from dnsRecords
    if (projectListItem?.dnsRecords && projectListItem.dnsRecords.length > 0) {
      console.log(chalk.bold("\nRPC Endpoints:"));
      for (const record of projectListItem.dnsRecords) {
        if (record.usageType === "rpc") {
          console.log(`  ${chalk.gray(record.network + ":")}  ${chalk.blue("https://" + record.dns)}`);
        }
      }
    }
  } catch (error) {
    spinner.fail(
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}
