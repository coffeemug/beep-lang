import { repl } from "./repl";
import { parse } from "./runtime/parser";
import { makeBeepContext } from "./bootstrap/bootload";
import { findSymbolByName } from "./bootstrap/symbol_space";
import type { ListObj } from "./data_structures/list";
import type { UnboundMethodObj } from "./bootstrap/unbound_method";
import type { ModuleObj } from "./bootstrap/module";
import { getBinding, type ScopeObj } from "./bootstrap/scope";
import type { MapObj } from "./data_structures/map";
import type { RuntimeObj } from "./runtime_objects";

async function main(): Promise<void> {
  const ctx = makeBeepContext();
  const {
    symbolSpaceObj: symbolSpace, show, callMethod, bindMethod,
    evaluate, intern, makeModuleObj,
  } = ctx;

  const methodsSym = findSymbolByName('methods', symbolSpace)!;

  /*
    Per-module scope tracking
    */
  const moduleScopes = new Map<ModuleObj, ScopeObj>();
  let activeModule: ModuleObj;

  function switchModule(module: ModuleObj): void {
    activeModule = module;
    if (!moduleScopes.has(module)) {
      moduleScopes.set(module, module.toplevelScope);
    }
  }

  const getCurrentScope = () => moduleScopes.get(activeModule)!;
  const setCurrentScope = (scope: ScopeObj) => moduleScopes.set(activeModule, scope);

  // Start in :repl module
  switchModule(makeModuleObj(intern("repl")));

  function run(input: string): string {
    const ast = parse(input, intern);
    if (ast.type !== 'block') {
      throw new Error('Parser must return block');
    }

    // Unwrap top-level block to thread scope across REPL lines
    // (block itself doesn't leak scope, but REPL should persist let bindings)
    let result: RuntimeObj = ctx.makeIntObj(0n);
    for (const e of ast.exprs) {
      const { value, scope } = evaluate(e, getCurrentScope());
      result = value;
      setCurrentScope(scope);
    }
    return show(result);
  }

  function complete(input: string): string[] {
    try {
      const ast = parse(input, intern);
      const { value: obj } = evaluate(ast, activeModule.toplevelScope);

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
    const { value: arg } = evaluate(ast, activeModule.toplevelScope);
    if (arg.tag == 'ModuleObj') {
      switchModule(arg as ModuleObj);
    } else if (arg.tag == 'SymbolObj') {
      const modules = getBinding(ctx.modulesSymbol, ctx.dynamicScope) as MapObj;
      const module = modules.kv.get(arg);
      if (!module) {
        throw new Error("Module must exist");
      }
      switchModule(module as ModuleObj);
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
