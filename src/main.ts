import { repl } from "./repl";
import { parse } from "./runtime/parser";
import { makeInterpreter } from "./runtime/interpreter";
import { initSysModule } from "./bootstrap/sys_module";
import { findSymbolByName, initSymbolEnv } from "./bootstrap/symbol_env";
import type { ListObj } from "./data_structures/list";
import type { MethodObj } from "./core_objects/methods";

async function main(): Promise<void> {
  const env = initSymbolEnv();
  const sysModule = initSysModule(env);
  const { evaluate, show, callMethod, bindThis } = makeInterpreter(env, sysModule);

  function run(input: string): string {
    const ast = parse(input, env);
    const result = evaluate(ast, sysModule);
    return show(result, sysModule);
  }

  function complete(input: string): string[] {
    try {
      const ast = parse(input, env);
      const obj = evaluate(ast, sysModule);

      // Get the methods method from the object's type
      const methodsSym = findSymbolByName('methods', env);
      if (!methodsSym) return [];
      const methodsMethod = obj.type.methods.get(methodsSym);
      if (!methodsMethod) return [];

      // Bind this and call the method
      const boundMethod = bindThis(methodsMethod, obj);
      const result = callMethod(boundMethod, [], sysModule) as ListObj;

      // Extract method names from the returned list
      return result.elements.map(m => (m as MethodObj).name.name);
    } catch {
      return [];
    }
  }

  await repl(run, complete);
}

main();
