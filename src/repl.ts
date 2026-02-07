import * as readline from "readline/promises";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join, dirname } from "path";

const HISTORY_FILE = join(homedir(), ".beep_history");
const MAX_HISTORY = 1000;

function loadHistory(): string[] {
  if (existsSync(HISTORY_FILE)) {
    const content = readFileSync(HISTORY_FILE, "utf-8");
    return content.split("\n").filter((line) => line.length > 0).reverse();
  }
  return [];
}

function saveHistory(history: string[]): void {
  const dir = dirname(HISTORY_FILE);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(HISTORY_FILE, [...history].reverse().join("\n") + "\n");
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

async function readBuffer_(
  rl: readline.Interface,
  getPrompt: () => string
): Promise<string | null> {
  let buffer = "";

  // Track Ctrl+J (0x0A) vs Enter (0x0D) via raw stdin bytes.
  // Only relevant for TTY — in raw mode, Enter sends \r (0x0D) and Ctrl+J sends \n (0x0A).
  // For piped input, newlines are \n but shouldn't trigger continuation.
  let lastWasCtrlJ = false;
  const dataHandler = process.stdin.isTTY ? (chunk: Buffer) => {
    for (const byte of chunk) {
      if (byte === 0x0A) lastWasCtrlJ = true;
      else if (byte === 0x0D) lastWasCtrlJ = false;
    }
  } : null;
  if (dataHandler) process.stdin.on('data', dataHandler);

  try {
    while (true) {
      const prompt = buffer ? "... " : getPrompt();
      let line: string;

      try {
        line = await rl.question(prompt);
      } catch {
        return null;
      }

      const shouldContinue = lastWasCtrlJ;
      lastWasCtrlJ = false;

      buffer += (buffer ? "\n" : "") + line;

      if (shouldContinue || isInsideBlock(buffer)) {
        continue;
      }

      const trimmed = buffer.trim();
      if (trimmed.length === 0) {
        buffer = "";
        continue;
      }

      return trimmed;
    }
  } finally {
    if (dataHandler) process.stdin.removeListener('data', dataHandler);
  }
}

async function readBuffer(
  complete: (expr: string) => string[],
  getPrompt: () => string
): Promise<string | null> {
  const history = loadHistory().slice(-MAX_HISTORY);
  const collectedHistory: string[] = [...history];

  // For now we have to create and teardown readline interface on every REPL read,
  // otherwise io.readline() doesn't work. Once io and async/wait business shakes
  // out, we can possibly create readline interface once and tear it down at the end.
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    history: history,
    historySize: MAX_HISTORY,
    completer: (line: string): [string[], string] => {
      const dotMatch = line.match(/^(.+)\.$/);
      if (dotMatch) {
        const expr = dotMatch[1];
        try {
          const methods = complete(expr);
          if (methods.length > 0) {
            process.stdout.write('\n' + methods.join('  ') + '\n');
            process.stdout.write(getPrompt() + line);
          }
        } catch {
          // ignore
        }
      }
      return [[], line];
    }
  });

  const input = await readBuffer_(rl, getPrompt);
  if (input) {
    collectedHistory.unshift(input);
  }

  saveHistory(collectedHistory.slice(0, MAX_HISTORY));
  rl.close();
  return input;
}

export async function repl(
  run: (input: string) => string,
  complete: (expr: string) => string[],
  getPrompt: () => string,
  commands: Record<string, (arg: string) => string | void>
): Promise<void> {
  while (true) {
    const input = await readBuffer(complete, getPrompt);
    if (input === null) {
      break;
    }

    // For piped input, exit after processing
    const shouldExit = !process.stdin.isTTY;

    // Handle commands
    if (input.startsWith("/")) {
      const spaceIdx = input.indexOf(" ");
      const cmd = spaceIdx === -1 ? input.slice(1) : input.slice(1, spaceIdx);
      const arg = spaceIdx === -1 ? "" : input.slice(spaceIdx + 1).trim();
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
      continue;
    }

    try {
      const result = run(input);
      console.log(result);
    } catch (e) {
      if (e instanceof Error) {
        console.log(`Error: ${e.message}`);
      } else {
        console.log("Unknown error");
      }
    }

    if (shouldExit) break;
  }
}
