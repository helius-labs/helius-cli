// Output utilities for JSON mode

export interface OutputOptions {
  json?: boolean;
}

export function outputJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function outputError(error: string, code: string, details?: Record<string, unknown>): never {
  if (process.env.HELIUS_JSON === "1") {
    console.log(JSON.stringify({ error: code, message: error, ...details }));
  } else {
    console.error(error);
  }
  process.exit(1);
}
