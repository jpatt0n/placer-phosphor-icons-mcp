#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const SERVER_NAME = "placer-icons";
const SERVER_CONFIG = {
  command: "npx",
  args: [
    "--yes",
    "--package",
    "github:jpatt0n/placer-phosphor-icons-mcp",
    "placer-phosphor-icons-mcp"
  ]
};

function claudeDesktopConfigPath(): string {
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", "Claude", "claude_desktop_config.json");
  }

  if (process.platform === "win32") {
    const appData = process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming");
    return path.join(appData, "Claude", "claude_desktop_config.json");
  }

  return path.join(os.homedir(), ".config", "Claude", "claude_desktop_config.json");
}

function readConfig(configPath: string): Record<string, unknown> {
  if (!fs.existsSync(configPath)) {
    return {};
  }

  const raw = fs.readFileSync(configPath, "utf8").trim();
  if (!raw) {
    return {};
  }

  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Expected ${configPath} to contain a JSON object.`);
  }

  return parsed as Record<string, unknown>;
}

const configPath = claudeDesktopConfigPath();
const config = readConfig(configPath);
const existingServers = config.mcpServers;

if (existingServers && (typeof existingServers !== "object" || Array.isArray(existingServers))) {
  throw new Error(`Expected "mcpServers" in ${configPath} to be a JSON object.`);
}

config.mcpServers = {
  ...(existingServers as Record<string, unknown> | undefined),
  [SERVER_NAME]: SERVER_CONFIG
};

fs.mkdirSync(path.dirname(configPath), { recursive: true });
fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);

console.log(`Installed ${SERVER_NAME} in Claude Desktop config:`);
console.log(configPath);
console.log("Fully quit and reopen Claude Desktop to load the MCP server.");
