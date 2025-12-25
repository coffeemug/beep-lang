import type { Expr } from "./parser";
import type { RuntimeObj, TypeObj } from "../runtime_objects";
import { makeListObj } from "../data_structures/list";
import { bindMethod, makeUnboundMethodObj, type UnboundMethodObj } from "../core_objects/unbound_method";
import { defineBinding, getBinding, makeScope, type Scope } from "./scope";
import { makeStringObj, type StringObj } from "../data_structures/string";
import type { BoundMethodObj } from "../core_objects/bound_method";
import type { BeepKernel } from "../bootstrap/kernel";

export function makeInterpreter(k: BeepKernel) {
  const {
    stringTypeObj, listTypeObj, unboundMethodTypeObj,
    boundMethodTypeObj, thisSymbol, showSymbol, makeIntObj
   } = k;

  function evaluate(expr: Expr, scope: Scope): RuntimeObj {
    switch (expr.type) {
      case 'int': {
        return makeIntObj(expr.value);
      }

      case 'string': {
        return makeStringObj(expr.value, stringTypeObj);
      }

      case 'list': {
        const elements = expr.elements.map(e => evaluate(e, scope));
        return makeListObj(elements, listTypeObj);
      }

      case 'ident': {
        const value = getBinding(expr.sym, scope);
        if (!value) {
          throw new Error(`Unbound symbol ${show(expr.sym)}`);
        }
        return value;
      }

      case 'methodDef': {
        const receiverType = getBinding(expr.receiverType, scope) as TypeObj;
        if (!receiverType) {
          throw new Error(`Unknown type ${expr.receiverType.name}`);
        }
        const methodObj = makeUnboundMethodObj(
          receiverType,
          expr.name,
          expr.params,
          expr.body,
          unboundMethodTypeObj,
          scope
        );
        receiverType.methods.set(expr.name, methodObj);
        return methodObj;
      }

      case 'fieldAccess': {
        const receiver = evaluate(expr.receiver, scope);
        const method = receiver.type.methods.get(expr.fieldName);
        if (!method) {
          throw new Error(`No method ${expr.fieldName.name} on ${show(receiver.type)}`);
        }
        return bindMethod(method, receiver, boundMethodTypeObj);
      }

      case 'funcall': {
        const fn = evaluate(expr.fn, scope) as BoundMethodObj;
        if (fn.tag !== 'BoundMethodObj') {
          throw new Error(`Cannot call ${show(fn)}`);
        }

        const args = expr.args.map(arg => evaluate(arg, scope));
        return callMethod(fn, args);
      }
    }

    const _exhaustive: never = expr;
  }

  function show(obj: RuntimeObj): string {
    const showMethod = obj.type.methods.get(showSymbol);
    if (!showMethod) {
      return `<${obj.tag}:noshow>`;
    }

    const boundMethod = bindMethod(showMethod, obj, boundMethodTypeObj);
    const result = callMethod(boundMethod, []) as StringObj;
    return result.value;
  }

  function callMethod(method: BoundMethodObj, args: RuntimeObj[]): RuntimeObj {
    const expectedCount = method.mode === 'native' ? method.argCount : method.argNames.length;
    if (args.length !== expectedCount) {
      throw new Error(`${method.name.name} expects ${expectedCount} args, got ${args.length}`);
    }

    if (method.mode === 'native') {
      return method.nativeFn(method.receiverInstance, args);
    }

    let callScope = makeScope(method.scopeClosure);
    defineBinding(thisSymbol, method.receiverInstance, callScope);
    for (let i = 0; i < method.argNames.length; i++) {
      defineBinding(method.argNames[i], args[i], callScope);
    }
    return evaluate(method.body, callScope);
  }

  return {
    evaluate, show, callMethod,
    bindMethod: (method: UnboundMethodObj, receiver: RuntimeObj) =>
      bindMethod(method, receiver, boundMethodTypeObj),
  };
}
