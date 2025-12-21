import * as readline from "readline";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join, dirname } from "path";

const HISTORY_FILE = join(homedir(), ".beep_history");
const MAX_HISTORY = 1000;

function loadHistory(): string[] {
  if (existsSync(HISTORY_FILE)) {
    const content = readFileSync(HISTORY_FILE, "utf-8");
    return content.split("\n").filter((line) => line.length > 0);
  }
  return [];
}

function saveHistory(history: string[]): void {
  const dir = dirname(HISTORY_FILE);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(HISTORY_FILE, history.join("\n") + "\n");
}

export async function repl(run: (input: string) => string): Promise<void> {
  const history = loadHistory().slice(-MAX_HISTORY);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "> ",
    history: history,
    historySize: MAX_HISTORY,
  });

  rl.prompt();

  rl.on("line", (line) => {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      rl.prompt();
      return;
    }

    history.push(trimmed);

    try {
      const result = run(trimmed);
      console.log(result);
    } catch (e) {
      if (e instanceof Error) {
        console.log(`Error: ${e.message}`);
      } else {
        console.log("Unknown error");
      }
    }

    rl.prompt();
  });

  rl.on("close", () => {
    saveHistory(history.slice(-MAX_HISTORY));
    console.log();
    process.exit(0);
  });
}
