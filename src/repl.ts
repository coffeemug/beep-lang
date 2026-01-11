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

// Check if input has unmatched block starters (def/struct/for/if/while/case) vs ends
function isInsideBlock(input: string): boolean {
  const defCount = (input.match(/\bdef\b/g) || []).length;
  const structCount = (input.match(/\bstruct\b/g) || []).length;
  const forCount = (input.match(/\bfor\b/g) || []).length;
  const whileCount = (input.match(/\bwhile\b/g) || []).length;
  const ifCount = (input.match(/\bif\b/g) || []).length;
  const caseCount = (input.match(/\bcase\b/g) || []).length;
  // Match 'end' as a word, but also after digits (e.g., "3end")
  // Exclude :end (symbol) by requiring it's not preceded by ':'
  const endCount = (input.match(/(?<=^|[^a-zA-Z_:])end(?=$|[^a-zA-Z0-9_])/g) || []).length;
  return defCount + structCount + forCount + whileCount + ifCount + caseCount > endCount;
}

export async function repl(
  run: (input: string) => string,
  complete: (expr: string) => string[],
  getPrompt: () => string,
  commands: Record<string, (arg: string) => string | void>
): Promise<void> {
  const history = loadHistory().slice(-MAX_HISTORY);
  let buffer = "";

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: getPrompt(),
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
    buffer += (buffer ? "\n" : "") + line;

    // If inside a block, continue accumulating
    if (isInsideBlock(buffer)) {
      rl.setPrompt("... ");
      rl.prompt();
      return;
    }

    const trimmed = buffer.trim();
    buffer = "";

    if (trimmed.length === 0) {
      rl.setPrompt(getPrompt());
      rl.prompt();
      return;
    }

    // Handle commands
    if (trimmed.startsWith("/")) {
      const spaceIdx = trimmed.indexOf(" ");
      const cmd = spaceIdx === -1 ? trimmed.slice(1) : trimmed.slice(1, spaceIdx);
      const arg = spaceIdx === -1 ? "" : trimmed.slice(spaceIdx + 1).trim();
      const handler = commands[cmd];
      if (handler) {
        try {
          const result = handler(arg);
          if (result) console.log(result);
        } catch (e) {
          if (e instanceof Error) {
            console.log(`Error: ${e.message}`);
          } else {
            console.log("Unknown error");
          }
        }
      } else {
        console.log(`Unknown command: ${cmd}`);
      }
      rl.setPrompt(getPrompt());
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

    rl.setPrompt(getPrompt());
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
