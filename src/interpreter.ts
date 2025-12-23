import type { SymbolEnv } from "./bootstrap/symbol_env";
import { makeFrame, withFrame } from "./frame";
import type { Expr } from "./parser";
import type { RuntimeObj, TypeObj } from "./runtime_objs";
import { makeIntObj } from "./runtime_objs/int";
import { makeListObj } from "./runtime_objs/list";
import { makeMethodObj, type MethodObj } from "./runtime_objs/methods";
import { defineBinding, type ModuleObj } from "./runtime_objs/module";
import { makeStringObj, type StringObj } from "./runtime_objs/string";

export function evaluate(expr: Expr, m: ModuleObj, env: SymbolEnv): RuntimeObj {
  switch (expr.type) {
    case 'int': {
      return makeIntObj(expr.value, intTypeObj);
    }

    case 'string': {
      return makeStringObj(expr.value, stringTypeObj);
    }

    case 'list': {
      const elements = expr.elements.map(e => evaluate(e, m, env));
      return makeListObj(elements, listTypeObj);
    }

    case 'ident': {
      const value = findBinding(env, expr.sym);
      if (!value) {
        throw new Error(`Unbound symbol ${show(expr.sym, env)}`);
      }
      return value;
    }

    case 'methodDef': {
      const receiverType = findBinding(env, expr.receiverType) as TypeObj;
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
      const receiver = evaluate(expr.receiver, m, env);
      const method = receiver.type.methods.get(expr.fieldName);
      if (!method) {
        throw new Error(`No method ${expr.fieldName.name} on ${show(receiver.type, env)}`);
      }
      return bindThis(method, receiver, env);
    }

    case 'funcall': {
      const fn = evaluate(expr.fn, m, env) as MethodObj;
      if (fn.tag !== 'MethodObj') {
        throw new Error(`Cannot call ${show(fn, env)}`);
      }

      const args = expr.args.map(arg => evaluate(arg, m, env));
      return callMethod(fn, args, env);
    }
  }

  const _exhaustive: never = expr;
}

export function show(obj: RuntimeObj, env: SymbolEnv): string {
  const showMethod = obj.type.methods.get(showSym);
  if (!showMethod) {
    return `<${obj.tag}:noshow>`;
  }

  const boundMethod = bindThis(showMethod, obj, env);
  const result = callMethod(boundMethod, [], env) as StringObj;
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

export function bindThis(method: MethodObj, receiver: RuntimeObj, env: SymbolEnv): MethodObj {
  const closureFrame = makeFrame(method.closureFrame);
  closureFrame.bindings.set(thisSymbol.id, receiver);
  return { ...method, closureFrame };
}
