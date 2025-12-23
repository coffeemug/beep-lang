import { repl } from "./repl";
import { parse } from "./runtime/parser";
import { bindThis, callMethod, evaluate, show } from "./runtime/interpreter";
import { initSysModule } from "./bootstrap/sys_module";
import { findSymbolByName, initSymbolEnv, type SymbolEnv } from "./bootstrap/symbol_env";
import type { ListObj } from "./data_structures/list";
import type { MethodObj } from "./core_objects/methods";
import type { ModuleObj } from "./core_objects/module";

async function main(): Promise<void> {
  const env = initSymbolEnv();
  const sysModule = initSysModule(env);

  await repl(
    (input: string) => run(input, sysModule, env),
    (expr: string) => complete(expr, sysModule, env)
  );
}

function run(input: string, m: ModuleObj, env: SymbolEnv): string {
  const ast = parse(input, env);
  const result = evaluate(ast, m, env);
  return show(result, m, env);
}

function complete(input: string, m: ModuleObj, env: SymbolEnv): string[] {
  try {
    const ast = parse(input, env);
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
