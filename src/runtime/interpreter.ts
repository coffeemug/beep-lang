import type { Expr } from "./parser";
import type { RuntimeObj, TypeObj } from "../runtime_objects";
import { defineBinding, getBinding, type ScopeObj } from "../bootstrap/scope";
import type { BoundMethodObj } from "../bootstrap/bound_method";
import type { BeepKernel } from "../bootstrap/bootload";

export function makeInterpreter(k: BeepKernel) {
  const {
    thisSymbol, showSymbol, atSymbol, makeIntObj, makeStringObj, makeListObj,
    bindMethod, makeUnboundMethodObj, show, callMethod, getFieldSymbol
   } = k;

  function evaluate(expr: Expr, scope: ScopeObj): RuntimeObj {
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

      case 'dynamicIdent': {
        const value = getBinding(expr.sym, k.dynamicScope);
        if (!value) {
          throw new Error(`Unbound dynamic variable $${expr.sym.name}`);
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
          scope.type,
          expr.name,
          expr.params,
          expr.body,
        );
        const methodObj = bindMethod(methodObj_, scope);
        defineBinding(methodObj.name, methodObj, scope);
        return methodObj;
      }

      case 'fieldAccess': {
        const receiver = evaluate(expr.receiver, scope);
        const method = receiver.type.methods.get(getFieldSymbol);
        if (!method) {
          throw new Error(`No method 'get_field' on ${show(receiver.type)}`);
        }
        const boundMethod = bindMethod(method, receiver);
        return callMethod(boundMethod, [expr.fieldName]);
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
