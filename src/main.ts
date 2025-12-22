import { repl } from "./repl";
import { parse } from "./parser";
import { evaluate, print } from "./interpreter";
import { intern, createEnv, type Env, bindSymbol } from "./env";
import { makeIntTypeObj } from "./runtime_objs/int";

async function main(): Promise<void> {
  const env = createEnv();
  const intSym = intern(env, 'int');
  bindSymbol(env, intSym, makeIntTypeObj(env.cachedRootTypeObj.deref()!))
  
  await repl((input: string) =>
    run(input, env));
}

function run(input: string, env: Env): string {
  const ast = parse(input);
  const result = evaluate(ast, env);
  return print(result);
}

main();
