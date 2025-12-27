import { repl } from "./repl";
import { parse } from "./runtime/parser";
import { createKernel } from "./bootstrap/bootload";
import { findSymbolByName } from "./bootstrap/symbol_space";
import type { ListObj } from "./data_structures/list";
import type { UnboundMethodObj } from "./bootstrap/unbound_method";
import type { ModuleObj } from "./bootstrap/module";
import { getBinding } from "./bootstrap/scope";
import type { MapObj } from "./data_structures/map";

async function main(): Promise<void> {
  const kernel = createKernel();
  const {
    symbolSpaceObj: symbolSpace, show, callMethod, bindMethod,
    evaluate, intern, makeModuleObj,
  } = kernel;

  const methodsSym = findSymbolByName('methods', symbolSpace)!;
  let activeModule = makeModuleObj(intern("repl"));

  function run(input: string): string {
    const ast = parse(input, intern);
    const result = evaluate(ast, activeModule.toplevelScope);
    return show(result);
  }

  function complete(input: string): string[] {
    try {
      const ast = parse(input, intern);
      const obj = evaluate(ast, activeModule.toplevelScope);

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

  function getPrompt(): string {
    return `${activeModule.name.name}> `;
  }

  function inCmdHandler(arg_: string) {
    const ast = parse(arg_, intern);
    const arg = evaluate(ast, activeModule.toplevelScope);
    if (arg.tag == 'ModuleObj') {
      activeModule = arg as ModuleObj;
    } else if (arg.tag == 'SymbolObj') {
      const modules = getBinding(kernel.modulesSymbol, kernel.dynamicScope) as MapObj;
      const module = modules.kv.get(arg);
      if (!module) {
        throw new Error("Module must exist");
      }
      activeModule = module as ModuleObj;
    } else {
      throw new Error("Must be module or symbol");
    }
  }

  const commands = {
    in: inCmdHandler,
  };

  await repl(run, complete, getPrompt, commands);
}

main();
