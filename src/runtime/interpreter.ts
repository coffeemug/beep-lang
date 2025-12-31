import type { Expr } from "./parser";
import type { RuntimeObj, TypeObj } from "../runtime_objects";
import { defineBinding, getBinding, type ScopeObj } from "../bootstrap/scope";
import type { BoundMethodObj } from "../bootstrap/bound_method";
import type { BeepKernel } from "../bootstrap/bootload";

export type EvalResult = { value: RuntimeObj; scope: ScopeObj };

export function makeInterpreter(k: BeepKernel) {
  const {
    thisSymbol, showSymbol, atSymbol, makeIntObj, makeStringObj, makeListObj, makeMapObj,
    bindMethod, makeUnboundMethodObj, show, callMethod, getFieldSymbol, makeScopeObj
   } = k;

  function evaluate(expr: Expr, scope: ScopeObj): EvalResult {
    const ret = (value: RuntimeObj) => ({ value, scope });

    switch (expr.type) {
      case 'int':
        return ret(makeIntObj(expr.value));

      case 'string':
        return ret(makeStringObj(expr.value));

      case 'symbol':
        return ret(expr.sym);

      case 'list':
        return ret(makeListObj(expr.elements.map(e => evaluate(e, scope).value)));

      case 'map': {
        const pairs: [typeof expr.pairs[0]['key'], RuntimeObj][] =
          expr.pairs.map(p => [p.key, evaluate(p.value, scope).value]);
        return ret(makeMapObj(pairs));
      }

      case 'ident': {
        const value = getBinding(expr.sym, scope);
        if (!value) {
          throw new Error(`Unbound symbol ${show(expr.sym)}`);
        }
        return ret(value);
      }

      case 'dynamicIdent': {
        const value = getBinding(expr.sym, k.dynamicScope);
        if (!value) {
          throw new Error(`Unbound dynamic variable $${expr.sym.name}`);
        }
        return ret(value);
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
        return ret(methodObj);
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

        let targetScope = scope;
        while (targetScope.parent) {
          targetScope = targetScope.parent;
        }

        defineBinding(methodObj.name, methodObj, targetScope);
        return ret(methodObj);
      }

      case 'fieldAccess': {
        const receiver = evaluate(expr.receiver, scope).value;
        const method = receiver.type.methods.get(getFieldSymbol);
        if (!method) {
          throw new Error(`No method 'get_field' on ${show(receiver.type)}`);
        }
        const boundMethod = bindMethod(method, receiver);
        return ret(callMethod(boundMethod, [expr.fieldName]));
      }

      case 'indexAccess': {
        const receiver = evaluate(expr.receiver, scope).value;
        const index = evaluate(expr.index, scope).value;
        const method = receiver.type.methods.get(atSymbol);
        if (!method) {
          throw new Error(`No method 'at' on ${show(receiver.type)}`);
        }
        const boundMethod = bindMethod(method, receiver);
        return ret(callMethod(boundMethod, [index]));
      }

      case 'funcall': {
        const fn = evaluate(expr.fn, scope).value as BoundMethodObj;
        if (fn.tag !== 'BoundMethodObj') {
          throw new Error(`Cannot call ${show(fn)}`);
        }
        const args = expr.args.map(arg => evaluate(arg, scope).value);
        return ret(callMethod(fn, args));
      }

      case 'block': {
        const savedDynamicScope = k.dynamicScope;
        try {
          let result: RuntimeObj = makeIntObj(0n);
          let innerScope = scope;
          for (const e of expr.exprs) {
            const evalResult = evaluate(e, innerScope);
            result = evalResult.value;
            innerScope = evalResult.scope;
          }
          return ret(result);
        } finally {
          k.dynamicScope = savedDynamicScope;
        }
      }

      case 'let': {
        const values = expr.bindings.map(b => evaluate(b.value, scope).value);

        const letScope = makeScopeObj(scope);
        k.dynamicScope = makeScopeObj(k.dynamicScope);

        for (let i = 0; i < expr.bindings.length; i++) {
          const binding = expr.bindings[i];
          if (binding.scope === 'dynamic') {
            defineBinding(binding.name, values[i], k.dynamicScope);
            letScope.dynamicIntros.add(binding.name.id);
          } else {
            defineBinding(binding.name, values[i], letScope);
          }
        }

        return {
          value: values.length == 1 ? values[0] : makeListObj(values),
          scope: letScope
        };
      }
    }

    const _exhaustive: never = expr;
  }

  return {
    evaluate,
  }
}
