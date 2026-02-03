import chalk from "chalk";
import ora from "ora";
import { loadKeypair, loadKeypairFromBase64, signAuthMessage, getAddress } from "../lib/wallet.js";
import { signup } from "../lib/api.js";
import { setJwt } from "../lib/config.js";
import { keypairExists } from "./keygen.js";
import { outputJson, exitWithError, ExitCode, type OutputOptions } from "../lib/output.js";

interface LoginOptions extends OutputOptions {
  keypair: string;
  privateKey?: string;
}

export async function loginCommand(options: LoginOptions): Promise<void> {
  const spinner = options.json ? null : ora();

  try {
    // Check for base64 private key (flag takes priority, then env var, then file)
    const base64Key = options.privateKey || process.env.HELIUS_PRIVATE_KEY;

    spinner?.start("Loading keypair...");
    let keypair;

    if (base64Key) {
      try {
        keypair = loadKeypairFromBase64(base64Key);
      } catch (err) {
        if (options.json) {
          exitWithError("KEYPAIR_NOT_FOUND", err instanceof Error ? err.message : "Invalid base64 key", undefined, true);
        }
        spinner?.fail(err instanceof Error ? err.message : "Invalid base64 key");
        process.exit(ExitCode.KEYPAIR_NOT_FOUND);
      }
    } else {
      // Fall back to keypair file
      if (!keypairExists(options.keypair)) {
        if (options.json) {
          exitWithError("KEYPAIR_NOT_FOUND", `Keypair not found at ${options.keypair}`, undefined, true);
        }
        spinner?.fail(`Keypair not found at ${options.keypair}`);
        console.error(chalk.gray("Run `helius keygen` to generate a keypair, or use --private-key / HELIUS_PRIVATE_KEY."));
        process.exit(ExitCode.KEYPAIR_NOT_FOUND);
      }
      keypair = await loadKeypair(options.keypair);
    }

    const walletAddress = await getAddress(keypair);
    spinner?.succeed(`Wallet: ${chalk.cyan(walletAddress)}`);

    // Sign auth message
    spinner?.start("Signing authentication message...");
    const { message, signature } = signAuthMessage(keypair.secretKey);
    spinner?.succeed("Message signed");

    // Call login API
    spinner?.start("Authenticating...");
    const authResult = await signup(message, signature, walletAddress);
    setJwt(authResult.token);
    spinner?.succeed("Authenticated");

    if (options.json) {
      outputJson({
        wallet: walletAddress,
        authenticated: true,
      });
      return;
    }

    console.log("\n" + chalk.green("✓ Login successful!"));
    console.log(`\nJWT saved to ~/.helius-cli/config.json`);
  } catch (error) {
    if (options.json) {
      exitWithError("AUTH_FAILED", error instanceof Error ? error.message : String(error), undefined, true);
    }
    spinner?.fail(
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(ExitCode.AUTH_FAILED);
  }
}
