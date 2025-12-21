import { repl } from "./repl";
import { parse } from "./parser";
import { evaluate, print } from "./interpreter";
import { bindSym, createEnv, type Env } from "./env";
import { makeRootTypeObj } from "./runtime_objs/root_type";
import { makeIntTypeObj } from "./runtime_objs/int";

function setupPrelude(env: Env) {
  let rootTypeObj = makeRootTypeObj();
  bindSym(env, 'type', rootTypeObj);

  let intTypeObj = makeIntTypeObj(env);
  bindSym(env, 'int', intTypeObj)
}

function run(input: string, env: Env): string {
  const ast = parse(input);
  const result = evaluate(ast, env);
  return print(result);
}

async function main(): Promise<void> {
  const rootEnv = createEnv();
  setupPrelude(rootEnv);
  
  await repl((input: string) =>
    run(input, rootEnv));
}

main();
