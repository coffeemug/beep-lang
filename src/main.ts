import { repl } from "./repl";
import { parse } from "./parser";
import { evaluate, show } from "./interpreter";
import { createEnv, type Env } from "./env";

async function main(): Promise<void> {
  const env = createEnv();

  await repl((input: string) =>
    run(input, env));
}

function run(input: string, env: Env): string {
  const ast = parse(input, env);
  const result = evaluate(ast, env);
  return show(result, env);
}

main();
