import { randomBytes } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { registerEntitySecretCiphertext } from "@circle-fin/developer-controlled-wallets";
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const apiKey: string | undefined = process.env.CIRCLE_API_KEY;
  if (!apiKey) {
    throw new Error("CIRCLE_API_KEY is required. Set it in .env first.");
  }

  // Refuse to overwrite an existing entity secret in .env.
  const existingEnv: string = existsSync(".env")
    ? readFileSync(".env", "utf8")
    : "";
  if (/^CIRCLE_ENTITY_SECRET=/m.test(existingEnv)) {
    throw new Error(
      "CIRCLE_ENTITY_SECRET already exists in .env. Refusing to overwrite it.",
    );
  }

  console.log("Generating 32-byte entity secret...");
  const entitySecret: string = randomBytes(32).toString("hex");
  const recoveryFilePath: string = "./recovery";

  mkdirSync(recoveryFilePath, { recursive: true });

  console.log("Registering entity secret with Circle...");
  await registerEntitySecretCiphertext({
    apiKey,
    entitySecret,
    recoveryFileDownloadPath: recoveryFilePath,
  });

  appendFileSync(".env", `\nCIRCLE_ENTITY_SECRET=${entitySecret}\n`);

  console.log("\n================================================");
  console.log("SUCCESS! Entity Secret Registered.");
  console.log("================================================");
  console.log(`Recovery file saved to a new file in: ${recoveryFilePath}`);
  console.log("CIRCLE_ENTITY_SECRET automatically added to your .env file!");
  console.log("================================================\n");
  console.log("You can now run 'npm run create-wallet' to generate your wallet.");
}

main().catch((err) => {
  console.error("Error:", err.message || err);
  process.exit(1);
});
