import * as readline from "readline";
import { existsSync, readFileSync, appendFileSync, mkdirSync } from "fs";
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

function saveHistoryLine(line: string): void {
  const dir = dirname(HISTORY_FILE);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  appendFileSync(HISTORY_FILE, line + "\n");
}

export async function repl(run: (input: string) => string): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "> ",
    history: loadHistory().slice(-MAX_HISTORY),
    historySize: MAX_HISTORY,
  });

  rl.prompt();

  rl.on("line", (line) => {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      rl.prompt();
      return;
    }

    saveHistoryLine(trimmed);

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
    console.log();
    process.exit(0);
  });
}
