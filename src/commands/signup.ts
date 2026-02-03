import chalk from "chalk";
import ora from "ora";
import { loadKeypair, signAuthMessage, getAddress } from "../lib/wallet.js";
import { signup, createProject, listProjects } from "../lib/api.js";
import { payUSDC, checkUsdcBalance } from "../lib/payment.js";
import { setJwt } from "../lib/config.js";
import { PAYMENT_AMOUNT } from "../constants.js";
import { keypairExists } from "./keygen.js";

interface SignupOptions {
  keypair: string;
}

export async function signupCommand(options: SignupOptions): Promise<void> {
  const spinner = ora();

  try {
    // Check keypair exists
    if (!keypairExists(options.keypair)) {
      console.error(chalk.red(`Error: Keypair not found at ${options.keypair}`));
      console.error(chalk.gray("Run `helius keygen` to generate a keypair first."));
      process.exit(1);
    }

    // 1. Load keypair
    spinner.start("Loading keypair...");
    const keypair = await loadKeypair(options.keypair);
    const walletAddress = await getAddress(keypair);
    spinner.succeed(`Wallet: ${chalk.cyan(walletAddress)}`);

    // 2. Authenticate first (no payment yet)
    spinner.start("Signing authentication message...");
    const { message, signature } = signAuthMessage(keypair.secretKey);
    spinner.succeed("Message signed");

    spinner.start("Authenticating...");
    const authResult = await signup(message, signature, walletAddress);
    setJwt(authResult.token);
    spinner.succeed(authResult.newUser ? "Account created" : "Authenticated");

    // 3. Check existing projects BEFORE payment
    spinner.start("Checking existing projects...");
    const existingProjects = await listProjects(authResult.token);

    if (existingProjects.length > 0) {
      // User already has projects - no payment needed
      spinner.succeed("Found existing project(s)");
      console.log("\n" + chalk.yellow("You already have project(s):"));
      for (const p of existingProjects) {
        console.log(`  ${chalk.cyan(p.id)} - ${p.name}`);
        if (p.subscription) {
          console.log(`    Plan: ${p.subscription.plan}`);
        }
      }
      console.log(chalk.gray("\nNo payment required. Use `helius projects` to view details."));
      return;
    }

    spinner.succeed("No existing projects");

    // 4. Only now check balance and pay
    spinner.start("Checking USDC balance...");
    const balance = await checkUsdcBalance(keypair);
    if (balance < PAYMENT_AMOUNT) {
      spinner.fail(`Insufficient USDC. Have: ${balance / 1_000_000n}, Need: 1 USDC`);
      process.exit(1);
    }
    spinner.succeed(`USDC balance: ${chalk.green((Number(balance) / 1_000_000).toFixed(2))} USDC`);

    spinner.start("Sending 1 USDC payment...");
    const txSignature = await payUSDC(keypair);
    spinner.succeed(`Payment sent: ${chalk.cyan(txSignature)}`);

    // 5. Create project
    spinner.start("Creating project...");
    const project = await createProject(authResult.token);
    spinner.succeed("Project created");

    console.log("\n" + chalk.green("✓ Signup complete!"));
    console.log(`\nProject ID: ${chalk.cyan(project.id)}`);
    if (project.apiKeys && project.apiKeys.length > 0) {
      console.log(`API Key: ${chalk.cyan(project.apiKeys[0].keyId)}`);
    }

    // Show RPC endpoints if available
    if (project.dnsRecords && project.dnsRecords.length > 0) {
      console.log(chalk.bold("\nRPC Endpoints:"));
      for (const record of project.dnsRecords) {
        if (record.usageType === "rpc") {
          console.log(`  ${record.network}: ${chalk.blue("https://" + record.dns)}`);
        }
      }
    }

    console.log(
      `\nView transaction: ${chalk.blue(`https://solscan.io/tx/${txSignature}`)}`
    );
  } catch (error) {
    spinner.fail(
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}
