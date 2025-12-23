import { findSymbolByName, type SymbolEnv } from "../bootstrap/symbol_env";
import { makeFrame, withFrame } from "./frame";
import type { Expr } from "./parser";
import type { RuntimeObj, TypeObj } from "../runtime_objects";
import { makeIntObj, type IntTypeObj } from "../data_structures/int";
import { makeListObj, type ListTypeObj } from "../data_structures/list";
import { makeMethodObj, type MethodObj, type MethodTypeObj } from "../core_objects/methods";
import { defineBinding, getBinding, getBindingByName, type ModuleObj } from "../core_objects/module";
import { makeStringObj, type StringObj, type StringTypeObj } from "../data_structures/string";

export function evaluate(expr: Expr, m: ModuleObj, env: SymbolEnv): RuntimeObj {
  switch (expr.type) {
    case 'int': {
      const intTypeObj = getBindingByName<IntTypeObj>('int', m, env)!;
      return makeIntObj(expr.value, intTypeObj);
    }

    case 'string': {
      const stringTypeObj = getBindingByName<StringTypeObj>('string', m, env)!;
      return makeStringObj(expr.value, stringTypeObj);
    }

    case 'list': {
      const listTypeObj = getBindingByName<ListTypeObj>('list', m, env)!;
      const elements = expr.elements.map(e => evaluate(e, m, env));
      return makeListObj(elements, listTypeObj);
    }

    case 'ident': {
      const value = getBinding(expr.sym, m);
      if (!value) {
        throw new Error(`Unbound symbol ${show(expr.sym, m, env)}`);
      }
      return value;
    }

    case 'methodDef': {
      const receiverType = getBinding(expr.receiverType, m) as TypeObj;
      if (!receiverType) {
        throw new Error(`Unknown type ${expr.receiverType.name}`);
      }
      const methodTypeObj = getBindingByName<MethodTypeObj>('method', m, env)!;
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
      const receiver = evaluate(expr.receiver, m, env);
      const method = receiver.type.methods.get(expr.fieldName);
      if (!method) {
        throw new Error(`No method ${expr.fieldName.name} on ${show(receiver.type, m, env)}`);
      }
      return bindThis(method, receiver, m, env);
    }

    case 'funcall': {
      const fn = evaluate(expr.fn, m, env) as MethodObj;
      if (fn.tag !== 'MethodObj') {
        throw new Error(`Cannot call ${show(fn, m, env)}`);
      }

      const args = expr.args.map(arg => evaluate(arg, m, env));
      return callMethod(fn, args, m, env);
    }
  }

  const _exhaustive: never = expr;
}

export function show(obj: RuntimeObj, m: ModuleObj, env: SymbolEnv): string {
  const showSym = findSymbolByName('show', env);
  if (!showSym) {
    return `<${obj.tag}:noshow>`;
  }
  const showMethod = obj.type.methods.get(showSym);
  if (!showMethod) {
    return `<${obj.tag}:noshow>`;
  }

  const boundMethod = bindThis(showMethod, obj, m, env);
  const result = callMethod(boundMethod, [], m, env) as StringObj;
  return result.value;
}

export function callMethod(method: MethodObj, args: RuntimeObj[], m: ModuleObj, env: SymbolEnv): RuntimeObj {
  const expectedCount = method.mode === 'native' ? method.argCount : method.argNames.length;
  if (args.length !== expectedCount) {
    throw new Error(`${method.name.name} expects ${expectedCount} args, got ${args.length}`);
  }

  if (method.mode === 'native') {
    return method.nativeFn(method, args);
  }

  return withFrame(m, method.closureFrame, () => {
    for (let i = 0; i < method.argNames.length; i++) {
      defineBinding(method.argNames[i], args[i], m);
    }
    return evaluate(method.body, m, env);
  });
}

export function bindThis(method: MethodObj, receiver: RuntimeObj, m: ModuleObj, env: SymbolEnv): MethodObj {
  const closureFrame = makeFrame(method.closureFrame);
  const thisSymbol = findSymbolByName('this', env)!;
  closureFrame.bindings.set(thisSymbol.id, receiver);
  return { ...method, closureFrame };
}
