#!/usr/bin/env node
import { Command } from "commander";
import { signupCommand } from "../src/commands/signup.js";
import { loginCommand } from "../src/commands/login.js";
import { projectsCommand } from "../src/commands/projects.js";
import { projectCommand } from "../src/commands/project.js";
import { apikeysCommand, createApiKeyCommand } from "../src/commands/apikeys.js";
import { usageCommand } from "../src/commands/usage.js";
import { rpcCommand } from "../src/commands/rpc.js";

const program = new Command();

program
  .name("helius")
  .description("CLI to create free Helius accounts and manage projects")
  .version("1.0.0");

program
  .command("signup")
  .description("Pay 1 USDC + create account + project")
  .requiredOption("-k, --keypair <path>", "Path to Solana keypair file")
  .action(signupCommand);

program
  .command("login")
  .description("Authenticate with wallet")
  .requiredOption("-k, --keypair <path>", "Path to Solana keypair file")
  .action(loginCommand);

program
  .command("projects")
  .description("List all projects")
  .action(projectsCommand);

program
  .command("project [id]")
  .description("Get project details")
  .action(projectCommand);

// API Keys command with subcommands
const apikeysCmd = program
  .command("apikeys [project-id]")
  .description("List all API keys for project (or use 'apikeys create')");

apikeysCmd
  .command("create [project-id]")
  .description("Create new API key for project")
  .action(createApiKeyCommand);

// Default action for 'apikeys' (list)
apikeysCmd.action(apikeysCommand);

program
  .command("usage [project-id]")
  .description("Show credits usage for project")
  .action(usageCommand);

program
  .command("rpc [project-id]")
  .description("Show RPC endpoints for project")
  .action(rpcCommand);

program.parse();
