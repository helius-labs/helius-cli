# Helius CLI

Official command-line interface for [Helius](https://helius.dev) - the leading Solana RPC and API provider. Manage your Helius account, projects, API keys, and monitor usage directly from your terminal.

## Installation

```bash
# Install globally
pnpm i -g helius

# Or run locally
pnpm install
pnpm run build
```

## Usage

### Create Account (Signup)

Pay 1 USDC to create a new Helius account and project:

```bash
helius signup -k ~/my-wallet.json
helius signup --keypair ~/.config/solana/id.json
```

**Requirements:**
- Wallet must have >= 1 USDC (mainnet)
- Wallet must have some SOL for transaction fees (~0.01 SOL)

### Login

Authenticate with an existing account (no payment required):

```bash
helius login -k ~/my-wallet.json
```

### List Projects

```bash
helius projects
```

### Get Project Details

```bash
# If you have only one project, ID is optional
helius project

# With specific project ID
helius project fda9d30b-a7e8-40fa-bde6-8a85be60f69a
```

### API Keys

```bash
# List API keys
helius apikeys
helius apikeys <project-id>

# Create new API key
helius apikeys create
helius apikeys create <project-id>
```

### Credits Usage

```bash
helius usage
helius usage <project-id>
```

### RPC Endpoints

```bash
helius rpc
helius rpc <project-id>
```

## Commands

| Command | Description |
|---------|-------------|
| `helius signup -k <keypair>` | Pay 1 USDC + create account + project |
| `helius login -k <keypair>` | Authenticate with wallet |
| `helius projects` | List all projects |
| `helius project [id]` | Get project details |
| `helius apikeys [project-id]` | List all API keys for project |
| `helius apikeys create [project-id]` | Create new API key for project |
| `helius usage [project-id]` | Show credits usage for project |
| `helius rpc [project-id]` | Show RPC endpoints for project |

`[project-id]` is optional - defaults to the only project if user has just one.

## Signup Flow

```
1. Check USDC balance (>= 1 USDC)
   └─> If insufficient, exit with error

2. Send 1 USDC to treasury wallet
   └─> SPL Token transfer to CEs84tEowsXpH8u4VBf8rJSVgSRypFMfXw9CpGRtQgb6

3. Sign auth message (JSON format with timestamp)
   └─> Ed25519 detached signature, base58 encoded

4. POST /wallet-signup → get JWT token
   └─> No payment check here, just wallet ownership

5. POST /projects/create → create project
   └─> API checks on-chain if wallet paid 1 USDC to treasury
   └─> Returns project with API keys and RPC endpoints

6. Save JWT to ~/.helius-cli/config.json
```

## Configuration

The CLI stores authentication in `~/.helius-cli/config.json`:

```json
{
  "jwt": "eyJhbGciOiJIUzI1NiIs..."
}
```

## Keypair Format

Uses Solana CLI keypair format (JSON array of 64 bytes). Generate with:

```bash
solana-keygen new -o ~/my-wallet.json
```

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm run build

# Run in development
pnpm run dev -- signup -k ~/my-wallet.json
```

## License

MIT
