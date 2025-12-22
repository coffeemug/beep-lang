import type { Expr } from "./parser";
import type { RuntimeObj, TypeObj } from "./runtime_objs";
import { makeIntObj } from "./runtime_objs/int";
import { makeListObj } from "./runtime_objs/list";
import { makeMethodObj, type MethodObj } from "./runtime_objs/methods";
import { makeStringObj, type StringObj } from "./runtime_objs/string";
import { findBinding, makeFrame, bindSymbol, withFrame, type Env } from "./env";

export function evaluate(expr: Expr, env: Env): RuntimeObj {
  switch (expr.type) {
    case 'int': {
      return makeIntObj(expr.value, env.intTypeObj.deref()!);
    }

    case 'string': {
      return makeStringObj(expr.value, env.stringTypeObj.deref()!);
    }

    case 'list': {
      const elements = expr.elements.map(e => evaluate(e, env));
      return makeListObj(elements, env.listTypeObj.deref()!);
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
        env.methodTypeObj.deref()!,
        env.currentFrame
      );
      receiverType.methods.set(expr.name, methodObj);
      return methodObj;
    }

    case 'fieldAccess': {
      const receiver = evaluate(expr.receiver, env);
      const method = receiver.type.methods.get(expr.fieldName);
      if (!method) {
        throw new Error(`No method ${expr.fieldName.name} on ${show(receiver, env)}`);
      }
      return bindThis(method, receiver, env);
    }

    case 'funcall': {
      const fn = evaluate(expr.fn, env) as MethodObj;
      if (fn.tag !== 'MethodObj') {
        throw new Error(`Cannot call ${show(fn, env)}`);
      }

      const args = expr.args.map(arg => evaluate(arg, env));
      return callMethod(fn, args, env);
    }
  }

  const _exhaustive: never = expr;
}

export function show(obj: RuntimeObj, env: Env): string {
  const showMethod = obj.type.methods.get(env.showSym);
  if (!showMethod) {
    return `<${obj.tag}:noshow>`;
  }

  const boundMethod = bindThis(showMethod, obj, env);
  const result = callMethod(boundMethod, [], env) as StringObj;
  return result.value;
}

export function callMethod(method: MethodObj, args: RuntimeObj[], env: Env): RuntimeObj {
  const expectedCount = method.mode === 'native' ? method.argCount : method.argNames.length;
  if (args.length !== expectedCount) {
    throw new Error(`${method.name.name} expects ${expectedCount} args, got ${args.length}`);
  }

  if (method.mode === 'native') {
    return method.nativeFn(method, args);
  }

  return withFrame(env, method.closureFrame, () => {
    for (let i = 0; i < method.argNames.length; i++) {
      bindSymbol(env, method.argNames[i], args[i]);
    }
    return evaluate(method.body, env);
  });
}

export function bindThis(method: MethodObj, receiver: RuntimeObj, env: Env): MethodObj {
  const closureFrame = makeFrame(method.closureFrame);
  closureFrame.bindings.set(env.thisSymbol.id, receiver);
  return { ...method, closureFrame };
}
