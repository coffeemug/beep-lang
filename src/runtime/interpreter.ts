import { findSymbolByName, type SymbolEnv } from "../bootstrap/symbol_env";
import { makeFrame, withFrame } from "./frame";
import type { Expr } from "./parser";
import type { RuntimeObj, TypeObj } from "../runtime_objects";
import { makeIntObj, type IntTypeObj } from "../data_structures/int";
import { makeListObj, type ListTypeObj } from "../data_structures/list";
import { makeMethodObj, type MethodObj, type MethodTypeObj } from "../core_objects/methods";
import { defineBinding, getBinding, getBindingByName, type ModuleObj } from "../core_objects/module";
import { makeStringObj, type StringObj, type StringTypeObj } from "../data_structures/string";

export function makeInterpreter(env: SymbolEnv, sysModule: ModuleObj) {
  const intTypeObj = getBindingByName<IntTypeObj>('int', sysModule, env)!;
  const stringTypeObj = getBindingByName<StringTypeObj>('string', sysModule, env)!;
  const listTypeObj = getBindingByName<ListTypeObj>('list', sysModule, env)!;
  const methodTypeObj = getBindingByName<MethodTypeObj>('method', sysModule, env)!;

  function evaluate(expr: Expr, m: ModuleObj): RuntimeObj {
    switch (expr.type) {
      case 'int': {
        return makeIntObj(expr.value, intTypeObj);
      }

      case 'string': {
        return makeStringObj(expr.value, stringTypeObj);
      }

      case 'list': {
        const elements = expr.elements.map(e => evaluate(e, m));
        return makeListObj(elements, listTypeObj);
      }

      case 'ident': {
        const value = getBinding(expr.sym, m);
        if (!value) {
          throw new Error(`Unbound symbol ${show(expr.sym, m)}`);
        }
        return value;
      }

      case 'methodDef': {
        const receiverType = getBinding(expr.receiverType, m) as TypeObj;
        if (!receiverType) {
          throw new Error(`Unknown type ${expr.receiverType.name}`);
        }
        const methodObj = makeMethodObj(
          receiverType,
          expr.name,
          expr.params,
          expr.body,
          methodTypeObj,
          m.topFrame
        );
        receiverType.methods.set(expr.name, methodObj);
        return methodObj;
      }

      case 'fieldAccess': {
        const receiver = evaluate(expr.receiver, m);
        const method = receiver.type.methods.get(expr.fieldName);
        if (!method) {
          throw new Error(`No method ${expr.fieldName.name} on ${show(receiver.type, m)}`);
        }
        return bindThis(method, receiver);
      }

      case 'funcall': {
        const fn = evaluate(expr.fn, m) as MethodObj;
        if (fn.tag !== 'MethodObj') {
          throw new Error(`Cannot call ${show(fn, m)}`);
        }

        const args = expr.args.map(arg => evaluate(arg, m));
        return callMethod(fn, args, m);
      }
    }

    const _exhaustive: never = expr;
  }

  function show(obj: RuntimeObj, m: ModuleObj): string {
    const showSym = findSymbolByName('show', env);
    if (!showSym) {
      return `<${obj.tag}:noshow>`;
    }
    const showMethod = obj.type.methods.get(showSym);
    if (!showMethod) {
      return `<${obj.tag}:noshow>`;
    }

    const boundMethod = bindThis(showMethod, obj);
    const result = callMethod(boundMethod, [], m) as StringObj;
    return result.value;
  }

  function callMethod(method: MethodObj, args: RuntimeObj[], m: ModuleObj): RuntimeObj {
    const expectedCount = method.mode === 'native' ? method.argCount : method.argNames.length;
    if (args.length !== expectedCount) {
      throw new Error(`${method.name.name} expects ${expectedCount} args, got ${args.length}`);
    }

    if (method.mode === 'native') {
      const thisSymbol = findSymbolByName('this', env)!;
      const thisObj = method.closureFrame.bindings.get(thisSymbol.id)!;
      return method.nativeFn(thisObj, args, method);
    }

    return withFrame(m, method.closureFrame, () => {
      for (let i = 0; i < method.argNames.length; i++) {
        defineBinding(method.argNames[i], args[i], m);
      }
      return evaluate(method.body, m);
    });
  }

  function bindThis(method: MethodObj, receiver: RuntimeObj): MethodObj {
    const closureFrame = makeFrame(method.closureFrame);
    const thisSymbol = findSymbolByName('this', env)!;
    closureFrame.bindings.set(thisSymbol.id, receiver);
    return { ...method, closureFrame };
  }

  return { evaluate, show, callMethod, bindThis };
}
