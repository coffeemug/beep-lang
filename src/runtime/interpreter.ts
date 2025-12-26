import type { Expr } from "./parser";
import type { RuntimeObj, TypeObj } from "../runtime_objects";
import { defineBinding, getBinding, type Scope } from "./scope";
import type { BoundMethodObj } from "../core_objects/bound_method";
import type { BeepKernel } from "../bootstrap/kernel";

export function makeInterpreter(k: BeepKernel) {
  const {
    thisSymbol, showSymbol, atSymbol, makeIntObj, makeStringObj, makeListObj,
    bindMethod, makeUnboundMethodObj, show, callMethod
   } = k;

  function evaluate(expr: Expr, scope: Scope = k.activeModule.toplevelScope): RuntimeObj {
    switch (expr.type) {
      case 'int': {
        return makeIntObj(expr.value);
      }

      case 'string': {
        return makeStringObj(expr.value);
      }

      case 'symbol': {
        return expr.sym;
      }

      case 'list': {
        const elements = expr.elements.map(e => evaluate(e, scope));
        return makeListObj(elements);
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
          scope,
          receiverType,
          expr.name,
          expr.params,
          expr.body,
        );
        receiverType.methods.set(methodObj.name, methodObj);

        return methodObj;
      }

      case 'functionDef': {
        const methodObj_ = makeUnboundMethodObj(
          scope,
          k.activeModule.type,
          expr.name,
          expr.params,
          expr.body,
        );
        k.activeModule.type.methods.set(methodObj_.name, methodObj_);
        const methodObj = bindMethod(methodObj_, k.activeModule);
        defineBinding(methodObj.name, methodObj, scope);
        return methodObj;
      }

      case 'fieldAccess': {
        const receiver = evaluate(expr.receiver, scope);
        const method = receiver.type.methods.get(expr.fieldName);
        if (!method) {
          throw new Error(`No method ${expr.fieldName.name} on ${show(receiver.type)}`);
        }
        return bindMethod(method, receiver);
      }

      case 'indexAccess': {
        const receiver = evaluate(expr.receiver, scope);
        const index = evaluate(expr.index, scope);
        const method = receiver.type.methods.get(atSymbol);
        if (!method) {
          throw new Error(`No method 'at' on ${show(receiver.type)}`);
        }
        const boundMethod = bindMethod(method, receiver);
        return callMethod(boundMethod, [index]);
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

  return {
    evaluate,
  }
}
