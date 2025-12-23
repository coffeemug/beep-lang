import { repl } from "./repl";
import { parse } from "./parser";
import { bindThis, callMethod, evaluate, show } from "./interpreter";
import { initSysModule } from "./bootstrap/sys";
import { findSymbolByName, type SymbolEnv } from "./bootstrap/symbol_env";
import type { ListObj } from "./runtime_objs/list";
import type { MethodObj } from "./runtime_objs/methods";
import type { ModuleObj } from "./runtime_objs/module";

async function main(): Promise<void> {
  const env: SymbolEnv = {
    symbolTable: new Map(),
    nextSymbolId: 0,
  };
  const sysModule = initSysModule(env);

  await repl(
    (input: string) => run(input, sysModule, env),
    (expr: string) => complete(expr, sysModule, env)
  );
}

function run(input: string, m: ModuleObj, env: SymbolEnv): string {
  const ast = parse(input, m, env);
  const result = evaluate(ast, m, env);
  return show(result, m, env);
}

function complete(input: string, m: ModuleObj, env: SymbolEnv): string[] {
  try {
    const ast = parse(input, m, env);
    const obj = evaluate(ast, m, env);

    // Get the methods method from the object's type
    const methodsSym = findSymbolByName('methods', env);
    if (!methodsSym) return [];
    const methodsMethod = obj.type.methods.get(methodsSym);
    if (!methodsMethod) return [];

    // Bind this and call the method
    const boundMethod = bindThis(methodsMethod, obj, m, env);
    const result = callMethod(boundMethod, [], m, env) as ListObj;

    // Extract method names from the returned list
    return result.elements.map(m => (m as MethodObj).name.name);
  } catch {
    return [];
  }
}

main();
