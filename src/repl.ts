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

export async function repl(
  run: (input: string) => string,
  complete: (expr: string) => string[]
): Promise<void> {
  const history = loadHistory().slice(-MAX_HISTORY);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "> ",
    history: history,
    historySize: MAX_HISTORY,
    completer: (line: string): [string[], string] => {
      const dotMatch = line.match(/^(.+)\.$/);
      if (dotMatch) {
        const expr = dotMatch[1];
        try {
          const methods = complete(expr);
          if (methods.length > 0) {
            // Print completions manually on single TAB
            process.stdout.write('\n' + methods.join('  ') + '\n');
            // Redraw the prompt with the current line
            rl.prompt(true);
          }
        } catch {
          // ignore
        }
      }
      return [[], line];
    }
  });

  rl.prompt();

  rl.on("line", (line) => {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      rl.prompt();
      return;
    }

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
    const currentHistory = (rl as any).history as string[] | undefined;
    if (currentHistory) {
      saveHistory([...currentHistory].slice(-MAX_HISTORY));
    }
    console.log();
    process.exit(0);
  });
}
