import { parse, type Expr } from "./parser";
import type { SymbolObj } from "../bootstrap/symbol";
import { matchPattern, type Binding } from "./pattern";
import type { RuntimeObj, TypeObj } from "../runtime_objects";
import { defineBinding, getBinding, setBinding, hasDynamicIntro, type ScopeObj } from "../bootstrap/scope";
import type { BoundMethodObj } from "../bootstrap/bound_method";
import type { BeepContext } from "../bootstrap/bootload";
import type { ListObj } from "../data_structures/list";
import type { IntObj } from "../data_structures/int";
import type { StringObj } from "../data_structures/string";
import type { MapObj } from "../data_structures/map";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

export type EvalResult = { value: RuntimeObj; scope: ScopeObj };

export function makeInterpreter(k: BeepContext) {
  const {
    thisSymbol, makeIntObj, makeStringObj, makeListObj, makeMapObj,
    makeUnboundMethodObj, show, callBoundMethod, callMethod, makeScopeObj,
    defineNamedStruct, defineNamedPrototype, makeRangeObj, bindMethod
   } = k;

  function loadModule(path: string, force: boolean = false): RuntimeObj {
    const moduleName = k.intern(path);
    const modules = getBinding(k.modulesSymbol, k.dynamicScope) as MapObj;

    // Return existing module if already loaded (unless force reload)
    if (!force && modules.kv.has(moduleName)) {
      return modules.kv.get(moduleName)!;
    }

    const filename = path + '.beep';
    const loadpath = getBinding(k.intern('loadpath'), k.dynamicScope) as ListObj;

    let foundPath: string | null = null;
    for (const pathObj of loadpath.elements) {
      const basePath = (pathObj as StringObj).value;
      const fullPath = join(basePath, filename);
      if (existsSync(fullPath)) {
        foundPath = fullPath;
        break;
      }
    }

    if (!foundPath) {
      throw new Error(`Cannot find module: ${path}`);
    }

    const moduleObj = k.makeModuleObj(moduleName);

    const source = readFileSync(foundPath, 'utf-8');
    const ast = parse(source, k.intern);
    evaluate(ast, moduleObj.toplevelScope);

    return moduleObj;
  }

  // Creates a new scope with pattern bindings defined
  function scopedBindings(bindings: Binding[], parentScope: ScopeObj): ScopeObj {
    const newScope = makeScopeObj(parentScope);
    k.dynamicScope = makeScopeObj(k.dynamicScope);
    for (const binding of bindings) {
      if (binding.scope === 'dynamic') {
        defineBinding(binding.sym, binding.value, k.dynamicScope);
        newScope.dynamicIntros.add(binding.sym.id);
      } else {
        defineBinding(binding.sym, binding.value, newScope);
      }
    }
    return newScope;
  }

  function consumeIterable(iterable: RuntimeObj): RuntimeObj[] {
    const iter = callMethod(iterable, k.makeIterSymbol, []);
    const result: RuntimeObj[] = [];
    while (true) {
      const next = callMethod(iter, k.nextSymbol, []) as ListObj;
      if (k.isEqual(next.elements[0], k.doneSymbol)) break;
      result.push(next.elements[1]);
    }
    return result;
  }

  function evaluate(expr: Expr, scope: ScopeObj): EvalResult {
    const ret = (value: RuntimeObj) => ({ value, scope });

    switch (expr.type) {
      case 'int':
        return ret(makeIntObj(expr.value));

      case 'string':
        return ret(makeStringObj(expr.value));

      case 'quotedSymbol':
        return ret(expr.sym);

      case 'list': {
        const elements: RuntimeObj[] = [];
        for (const el of expr.elements) {
          if (el.kind === 'spread') {
            elements.push(...consumeIterable(evaluate(el.expr, scope).value));
          } else {
            elements.push(evaluate(el.expr, scope).value);
          }
        }
        return ret(makeListObj(elements));
      }

      case 'map': {
        const pairs: [SymbolObj, RuntimeObj][] = [];
        for (const el of expr.pairs) {
          if (el.kind === 'spread') {
            for (const item of consumeIterable(evaluate(el.expr, scope).value)) {
              if (item.tag !== 'ListObj') {
                throw new Error(`Spread into map requires [key, value] pairs, got ${show(item)}`);
              }
              const pair = item as ListObj;
              if (pair.elements.length !== 2) {
                throw new Error(`Map spread pairs must have exactly 2 elements, got ${pair.elements.length}`);
              }
              const key = pair.elements[0];
              if (key.tag !== 'SymbolObj') {
                throw new Error(`Map keys must be symbols, got ${show(key)}`);
              }
              pairs.push([key as SymbolObj, pair.elements[1]]);
            }
          } else {
            pairs.push([el.key, evaluate(el.value, scope).value]);
          }
        }
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
        return ret(callMethod(receiver, k.getMemberSymbol, [expr.fieldName]));
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

      case 'lambda': {
        const methodObj_ = makeUnboundMethodObj(
          scope,
          scope.type,
          k.intern('<lambda>'),
          expr.params,
          expr.body,
        );
        return ret(bindMethod(methodObj_, scope));
      }

      case 'not': {
        const value = evaluate(expr.expr, scope).value;
        return ret(k.isEqual(value, k.falseObj) ? k.trueObj : k.falseObj);
      }

      case 'fieldAccess': {
        const receiver = evaluate(expr.receiver, scope).value;
        return ret(callMethod(receiver, k.getMemberSymbol, [expr.fieldName]));
      }

      case 'indexAccess': {
        const receiver = evaluate(expr.receiver, scope).value;
        const index = evaluate(expr.index, scope).value;
        return ret(callMethod(receiver, k.getItemSymbol, [index]));
      }

      case 'indexAssign': {
        const receiver = evaluate(expr.receiver, scope).value;
        const index = evaluate(expr.index, scope).value;
        const value = evaluate(expr.value, scope).value;
        return ret(callMethod(receiver, k.setItemSymbol, [index, value]));
      }

      case 'fieldAssign': {
        const receiver = evaluate(expr.receiver, scope).value;
        const value = evaluate(expr.value, scope).value;
        return ret(callMethod(receiver, k.setMemberSymbol, [expr.fieldName, value]));
      }

      case 'memberAssign': {
        const receiver = getBinding(thisSymbol, scope);
        if (!receiver) {
          throw new Error(`Cannot use @${expr.fieldName.name} outside of a method`);
        }
        const value = evaluate(expr.value, scope).value;
        return ret(callMethod(receiver, k.setMemberSymbol, [expr.fieldName, value]));
      }

      case 'funcall': {
        const fn = evaluate(expr.fn, scope).value as BoundMethodObj;
        if (fn.tag !== 'BoundMethodObj') {
          throw new Error(`Cannot call ${show(fn)}`);
        }
        const args = expr.args.map(arg => evaluate(arg, scope).value);
        return ret(callBoundMethod(fn, args));
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
        const value = evaluate(expr.value, scope).value;
        const result = matchPattern(expr.pattern, value);
        if (!result.matched) {
          throw new Error(`Pattern match failed in let binding`);
        }
        const letScope = scopedBindings(result.bindings, scope);
        return { value, scope: letScope };
      }

      case 'assign': {
        const value = evaluate(expr.value, scope).value;
        const result = matchPattern(expr.target, value);
        if (!result.matched) {
          throw new Error(`Pattern match failed in assignment`);
        }
        for (const binding of result.bindings) {
          if (binding.scope === 'dynamic') {
            if (!hasDynamicIntro(binding.sym, scope)) {
              throw new Error(`Cannot assign to dynamic variable $${binding.sym.name} not introduced in lexical scope`);
            }
            if (!setBinding(binding.sym, binding.value, k.dynamicScope)) {
              throw new Error(`Dynamic variable $${binding.sym.name} not found in dynamic scope`);
            }
          } else {
            if (!setBinding(binding.sym, binding.value, scope)) {
              throw new Error(`Cannot assign to unbound variable ${show(binding.sym)}`);
            }
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

      case 'prototypeDef': {
        const prototypeType = defineNamedPrototype(expr.name);
        let targetScope = scope;
        while (targetScope.parent) {
          targetScope = targetScope.parent;
        }
        defineBinding(expr.name, prototypeType, targetScope);
        return ret(prototypeType);
      }

      case 'binOp': {
        switch (expr.op) {
          case '==': {
            const left = evaluate(expr.left, scope).value;
            const right = evaluate(expr.right, scope).value;
            return ret(k.isEqual(left, right) ? k.trueObj : k.falseObj);
          }

          case '%': {
            const left = evaluate(expr.left, scope).value;
            const right = evaluate(expr.right, scope).value;
            return ret(callMethod(left, k.modSymbol, [right]));
          }

          case '+': {
            const left = evaluate(expr.left, scope).value;
            const right = evaluate(expr.right, scope).value;
            return ret(callMethod(left, k.addSymbol, [right]));
          }

          case '-': {
            const left = evaluate(expr.left, scope).value;
            const right = evaluate(expr.right, scope).value;
            return ret(callMethod(left, k.subSymbol, [right]));
          }

          case '*': {
            const left = evaluate(expr.left, scope).value;
            const right = evaluate(expr.right, scope).value;
            return ret(callMethod(left, k.mulSymbol, [right]));
          }

          case '<': {
            const left = evaluate(expr.left, scope).value;
            const right = evaluate(expr.right, scope).value;
            return ret(callMethod(left, k.ltSymbol, [right]));
          }

          case '<=': {
            const left = evaluate(expr.left, scope).value;
            const right = evaluate(expr.right, scope).value;
            return ret(callMethod(left, k.lteSymbol, [right]));
          }

          case '>': {
            const left = evaluate(expr.left, scope).value;
            const right = evaluate(expr.right, scope).value;
            return ret(callMethod(left, k.gtSymbol, [right]));
          }

          case '>=': {
            const left = evaluate(expr.left, scope).value;
            const right = evaluate(expr.right, scope).value;
            return ret(callMethod(left, k.gteSymbol, [right]));
          }

          case 'and': {
            const left = evaluate(expr.left, scope).value;
            if (k.isEqual(left, k.falseObj)) return ret(left);
            return ret(evaluate(expr.right, scope).value);
          }

          case 'or': {
            const left = evaluate(expr.left, scope).value;
            if (!k.isEqual(left, k.falseObj)) return ret(left);
            return ret(evaluate(expr.right, scope).value);
          }

          default:
            throw new Error(`Unknown binary operator: ${expr.op}`);
        }
      }

      case 'for': {
        const iterable = evaluate(expr.iterable, scope).value;
        const iter = callMethod(iterable, k.makeIterSymbol, []);
        let result: RuntimeObj = makeIntObj(0n);

        while (true) {
          const next = callMethod(iter, k.nextSymbol, []) as ListObj;
          const tag = next.elements[0];
          if (k.isEqual(tag, k.doneSymbol)) break;

          const item = next.elements[1];
          const matchResult = matchPattern(expr.binding, item);
          if (!matchResult.matched) {
            throw new Error(`Pattern match failed in for loop`);
          }
          const loopScope = scopedBindings(matchResult.bindings, scope);
          result = evaluate(expr.body, loopScope).value;
        }
        return ret(result);
      }

      case 'while': {
        let result: RuntimeObj = makeIntObj(0n);
        while (true) {
          const cond = evaluate(expr.cond, scope).value;
          if (k.isEqual(cond, k.falseObj)) break;
          result = evaluate(expr.body, scope).value;
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

      case 'if': {
        for (const branch of expr.branches) {
          const cond = evaluate(branch.cond, scope).value;
          if (!k.isEqual(cond, k.falseObj)) {
            return ret(evaluate(branch.body, scope).value);
          }
        }
        if (expr.else_) {
          return ret(evaluate(expr.else_, scope).value);
        }
        return ret(makeIntObj(0n));
      }

      case 'case': {
        const subject = evaluate(expr.subject, scope).value;
        for (const { pattern, body } of expr.branches) {
          const result = matchPattern(pattern, subject);
          if (result.matched) {
            const savedDynamicScope = k.dynamicScope;
            const matchScope = scopedBindings(result.bindings, scope);
            const bodyResult = evaluate(body, matchScope).value;
            k.dynamicScope = savedDynamicScope;
            return ret(bodyResult);
          }
        }
        throw new Error("No pattern matched in case expression");
      }

      case 'use': {
        const moduleObj = loadModule(expr.path);

        // Use alias if provided, otherwise use the last part of path
        const bindingName = expr.alias
          ? k.intern(expr.alias)
          : k.intern(expr.path.split('/').pop()!);

        defineBinding(bindingName, moduleObj, scope);
        return ret(moduleObj);
      }

      case 'useNames': {
        const moduleObj = loadModule(expr.path);
        const moduleScope = (moduleObj as { toplevelScope: ScopeObj }).toplevelScope;

        const imported: RuntimeObj[] = [];
        for (const { name, alias } of expr.names) {
          const value = getBinding(k.intern(name), moduleScope);
          if (!value) {
            throw new Error(`Cannot import '${name}' from module ${expr.path}: not found`);
          }
          const bindingName = k.intern(alias ?? name);
          defineBinding(bindingName, value, scope);
          imported.push(value);
        }

        return ret(makeListObj(imported));
      }

      case 'mixInto': {
        const prototype = getBinding(expr.prototype, scope);
        if (!prototype) {
          throw new Error(`Unbound symbol ${show(expr.prototype)}`);
        }
        const target = getBinding(expr.target, scope);
        if (!target) {
          throw new Error(`Unbound symbol ${show(expr.target)}`);
        }
        // mix_into is an own method, so we need to get it via get_member
        const mixIntoMethod = callMethod(prototype, k.getMemberSymbol, [k.intern('mix_into')]);
        return ret(callBoundMethod(mixIntoMethod as BoundMethodObj, [target]));
      }
    }

    const _exhaustive: never = expr;
  }

  return {
    evaluate,
  }
}
