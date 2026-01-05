import type { Expr } from "./parser";
import type { RuntimeObj, TypeObj } from "../runtime_objects";
import { defineBinding, getBinding, setBinding, hasDynamicIntro, type ScopeObj } from "../bootstrap/scope";
import type { BoundMethodObj } from "../bootstrap/bound_method";
import type { BeepContext } from "../bootstrap/bootload";
import type { ListObj } from "../data_structures/list";
import type { RangeObj } from "../data_structures/range";
import type { IntObj } from "../data_structures/int";

export type EvalResult = { value: RuntimeObj; scope: ScopeObj };

export function makeInterpreter(k: BeepContext) {
  const {
    thisSymbol, makeIntObj, makeStringObj, makeListObj, makeMapObj,
    bindMethod, makeUnboundMethodObj, show, callMethod, makeScopeObj,
    defineNamedStruct, makeRangeObj
   } = k;

  function evaluate(expr: Expr, scope: ScopeObj): EvalResult {
    const ret = (value: RuntimeObj) => ({ value, scope });

    switch (expr.type) {
      case 'int':
        return ret(makeIntObj(expr.value));

      case 'string':
        return ret(makeStringObj(expr.value));

      case 'quotedSymbol':
        return ret(expr.sym);

      case 'list':
        return ret(makeListObj(expr.elements.map(e => evaluate(e, scope).value)));

      case 'map': {
        const pairs: [typeof expr.pairs[0]['key'], RuntimeObj][] =
          expr.pairs.map(p => [p.key, evaluate(p.value, scope).value]);
        return ret(makeMapObj(pairs));
      }

      case 'lexicalVar': {
        const value = getBinding(expr.sym, scope);
        if (!value) {
          throw new Error(`Unbound symbol ${show(expr.sym)}`);
        }
        return ret(value);
      }

      case 'dynamicVar': {
        const value = getBinding(expr.sym, k.dynamicScope);
        if (!value) {
          throw new Error(`Unbound dynamic variable $${expr.sym.name}`);
        }
        return ret(value);
      }

      case 'memberVar': {
        const receiver = getBinding(thisSymbol, scope);
        if (!receiver) {
          throw new Error(`Cannot use @${expr.fieldName.name} outside of a method`);
        }
        const getMemberMethod = receiver.type.methods.get(k.getMemberSymbol);
        if (!getMemberMethod) {
          throw new Error(`No get_member on ${show(receiver.type)}`);
        }
        return ret(callMethod(bindMethod(getMemberMethod, receiver), [expr.fieldName]));
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
        const getMemberMethod = receiver.type.methods.get(k.getMemberSymbol);
        if (!getMemberMethod) {
          throw new Error(`No get_member on ${show(receiver.type)}`);
        }
        return ret(callMethod(bindMethod(getMemberMethod, receiver), [expr.fieldName]));
      }

      case 'indexAccess': {
        const receiver = evaluate(expr.receiver, scope).value;
        const index = evaluate(expr.index, scope).value;
        const getItemMethod = receiver.type.methods.get(k.getItemSymbol);
        if (!getItemMethod) {
          throw new Error(`No get_item on ${show(receiver.type)}`);
        }
        return ret(callMethod(bindMethod(getItemMethod, receiver), [index]));
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

      case 'assign': {
        const value = evaluate(expr.value, scope).value;
        if (expr.target.scope === 'dynamic') {
          if (!hasDynamicIntro(expr.target.name, scope)) {
            throw new Error(`Cannot assign to dynamic variable $${expr.target.name.name} not introduced in lexical scope`);
          }
          if (!setBinding(expr.target.name, value, k.dynamicScope)) {
            throw new Error(`Dynamic variable $${expr.target.name.name} not found in dynamic scope`);
          }
        } else {
          if (!setBinding(expr.target.name, value, scope)) {
            throw new Error(`Cannot assign to unbound variable ${show(expr.target.name)}`);
          }
        }
        return ret(value);
      }

      case 'structDef': {
        const structType = defineNamedStruct(expr.name, expr.fields);
        let targetScope = scope;
        while (targetScope.parent) {
          targetScope = targetScope.parent;
        }
        defineBinding(expr.name, structType, targetScope);
        return ret(structType);
      }

      case 'binOp': {
        if (expr.op !== '==') {
          throw new Error(`Unknown binary operator: ${expr.op}`);
        }
        const left = evaluate(expr.left, scope).value;
        const right = evaluate(expr.right, scope).value;
        return ret(k.isEqual(left, right) ? k.trueObj : k.falseObj);
      }

      case 'for': {
        // TODO: use enumerables (once enumerable protocol is a thing)
        let iterable = evaluate(expr.iterable, scope).value;
        if (iterable.tag === 'RangeObj') {
          const listMethod = iterable.type.methods.get(k.intern('list'));
          if (!listMethod) {
            throw new Error('Range has no list method');
          }
          iterable = callMethod(bindMethod(listMethod, iterable), []);
        }
        if (iterable.tag !== 'ListObj') {
          throw new Error(`for loop requires a list or range, got ${show(iterable)}`);
        }
        let result: RuntimeObj = makeIntObj(0n);
        for (const item of (iterable as ListObj).elements) {
          const loopScope = makeScopeObj(scope);
          defineBinding(expr.binding, item, loopScope);
          result = evaluate(expr.body, loopScope).value;
        }
        return ret(result);
      }

      case 'range': {
        const start = evaluate(expr.start, scope).value;
        const end = evaluate(expr.end, scope).value;
        if (start.tag !== 'IntObj' || end.tag !== 'IntObj') {
          throw new Error(`range requires integers, got ${show(start)} and ${show(end)}`);
        }
        return ret(makeRangeObj(
          (start as IntObj).value,
          (end as IntObj).value,
          expr.mode
        ));
      }
    }

    const _exhaustive: never = expr;
  }

  return {
    evaluate,
  }
}
