import { repl } from "./repl";
import { parse } from "./runtime/parser";
import { createKernel } from "./bootstrap/kernel";
import { findSymbolByName } from "./bootstrap/symbol_env";
import type { ListObj } from "./data_structures/list";
import type { UnboundMethodObj } from "./core_objects/unbound_method";

async function main(): Promise<void> {
  const kernel = createKernel();
  const {
    symbolEnv, show, callMethod, bindMethod,
    evaluate, intern, makeNamedModuleObj,
  } = kernel;

  const methodsSym = findSymbolByName('methods', symbolEnv)!;

  const replModule = makeNamedModuleObj(intern("repl"));
  kernel.activeModule = replModule;

  function run(input: string): string {
    const ast = parse(input, intern);
    const result = evaluate(ast);
    return show(result);
  }

  function complete(input: string): string[] {
    try {
      const ast = parse(input, intern);
      const obj = evaluate(ast);

      // Get the methods method from the object's type
      const methodsMethod = obj.type.methods.get(methodsSym);
      if (!methodsMethod) return [];

      // Bind this and call the method
      const boundMethod = bindMethod(methodsMethod, obj);
      const result = callMethod(boundMethod, []) as ListObj;

      // Extract method names from the returned list
      return result.elements.map(m => (m as UnboundMethodObj).name.name);
    } catch {
      return [];
    }
  }

  await repl(run, complete);
}

main();
