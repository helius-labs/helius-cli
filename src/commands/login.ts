import chalk from "chalk";
import ora from "ora";
import { loadKeypair, signAuthMessage, getAddress } from "../lib/wallet.js";
import { signup } from "../lib/api.js";
import { setJwt } from "../lib/config.js";
import { keypairExists } from "./keygen.js";

interface LoginOptions {
  keypair: string;
}

export async function loginCommand(options: LoginOptions): Promise<void> {
  const spinner = ora();

  try {
    // Check keypair exists
    if (!keypairExists(options.keypair)) {
      console.error(chalk.red(`Error: Keypair not found at ${options.keypair}`));
      console.error(chalk.gray("Run `helius keygen` to generate a keypair first."));
      process.exit(1);
    }

    // Load keypair
    spinner.start("Loading keypair...");
    const keypair = await loadKeypair(options.keypair);
    const walletAddress = await getAddress(keypair);
    spinner.succeed(`Wallet: ${chalk.cyan(walletAddress)}`);

    // Sign auth message
    spinner.start("Signing authentication message...");
    const { message, signature } = signAuthMessage(keypair.secretKey);
    spinner.succeed("Message signed");

    // Call login API
    spinner.start("Authenticating...");
    const authResult = await signup(message, signature, walletAddress);
    setJwt(authResult.token);
    spinner.succeed("Authenticated");

    console.log("\n" + chalk.green("✓ Login successful!"));
    console.log(`\nJWT saved to ~/.helius-cli/config.json`);
  } catch (error) {
    spinner.fail(
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}
