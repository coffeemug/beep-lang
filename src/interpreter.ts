import type { Expr } from "./parser";
import type { RuntimeObj, TypeObj } from "./runtime_objs";
import { makeIntObj } from "./runtime_objs/int";
import { makeMethodObj, type MethodObj } from "./runtime_objs/methods";
import { findBinding, makeFrame, bindSymbol, withFrame, type Env } from "./env";

export function evaluate(expr: Expr, env: Env): RuntimeObj {
  switch (expr.type) {
    case 'int': {
      return makeIntObj(expr.value, env.intTypeObj.deref()!);
    }

    case 'ident': {
      const value = findBinding(env, expr.sym);
      if (!value) {
        throw new Error(`Unbound symbol ${print(expr.sym)}`);
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
        throw new Error(`No method ${expr.fieldName.name} on ${print(receiver)}`);
      }

      // Create a new frame with `this` bound, closing over method's closure frame
      const closureFrame = makeFrame(method.closureFrame);
      closureFrame.bindings.set(env.thisSymbol.id, receiver);

      // Return a new method that closes over this frame
      return {
        ...method,
        closureFrame,
      };
    }

    case 'funcall': {
      const fn = evaluate(expr.fn, env) as MethodObj;
      if (fn.tag !== 'MethodObj') {
        throw new Error(`Cannot call ${print(fn)}`);
      }

      const args = expr.args.map(arg => evaluate(arg, env));
      const receiver = fn.closureFrame.bindings.get(env.thisSymbol.id)!;

      if (fn.mode === 'native') {
        return fn.nativeFn(receiver, args);
      }

      return withFrame(env, fn.closureFrame, () => {
        for (let i = 0; i < fn.argNames.length; i++) {
          bindSymbol(env, fn.argNames[i], args[i]);
        }
        return evaluate(fn.body, env);
      });
    }
  }

  const _exhaustive: never = expr;
}

export function print(obj: RuntimeObj): string {
  switch (obj.tag) {
    case 'IntObj':
      return obj.value.toString();
    case 'IntTypeObj':
      return '<type int>';
    case 'RootTypeObj':
      return '<type type>';
    case 'SymbolObj':
      return `'${obj.name}:${obj.id}`;
    case 'SymbolTypeObj':
      return '<type symbol>';
    case 'MethodObj':
      return `<method:${obj.mode} ${obj.receiverType.name.name}/${obj.name.name}>`;
    case "MethodTypeObj":
      return '<type method>';
  }

  const _exhaustive: never = obj;
}
