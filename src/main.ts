import { repl } from "./repl";
import { parse } from "./parser";
import { evaluate, print } from "./interpreter";
import { intern, createEnv, type Env } from "./env";
import { makeRootTypeObj } from "./runtime_objs/root_type";
import { makeIntTypeObj } from "./runtime_objs/int";
import { makeSymbolObj_, makeSymbolTypeObj } from "./runtime_objs/symbol";

async function main(): Promise<void> {
  const rootEnv = createEnv();
  initRuntime(rootEnv);
  
  await repl((input: string) =>
    run(input, rootEnv));
}

function run(input: string, env: Env): string {
  const ast = parse(input);
  const result = evaluate(ast, env);
  return print(result);
}

function initRuntime(env: Env) {
  const rootTypeObj = makeRootTypeObj();
  const symbolTypeObj = makeSymbolTypeObj(rootTypeObj);

  // Intern rootTypeObj and symbolTypeObj (we have to bootstrap this manually)
  const rootTypeObjSym = makeSymbolObj_('type', symbolTypeObj, rootTypeObj);
  const symbolTypeObjSym = makeSymbolObj_('symbol', symbolTypeObj, symbolTypeObj);
  env.symbols.set('type', rootTypeObjSym);
  env.symbols.set('symbol', symbolTypeObjSym)

  intern(env, 'int', makeIntTypeObj(env));
}

main();
