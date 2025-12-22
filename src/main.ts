import { repl } from "./repl";
import { parse } from "./parser";
import { bindThis, callMethod, evaluate, show } from "./interpreter";
import { createEnv, type Env } from "./env";
import type { ListObj } from "./runtime_objs/list";
import type { MethodObj } from "./runtime_objs/methods";

async function main(): Promise<void> {
  const env = createEnv();

  await repl(
    (input: string) => run(input, env),
    (expr: string) => complete(expr, env)
  );
}

function run(input: string, env: Env): string {
  const ast = parse(input, env);
  const result = evaluate(ast, env);
  return show(result, env);
}

function complete(input: string, env: Env): string[] {
  try {
    const ast = parse(input, env);
    const obj = evaluate(ast, env);

    // Get the methods method from the object's type
    const methodsMethod = obj.type.methods.get(env.methodsSym);
    if (!methodsMethod) return [];

    // Bind this and call the method
    const boundMethod = bindThis(methodsMethod, obj, env);
    const result = callMethod(boundMethod, [], env) as ListObj;

    // Extract method names from the returned list
    return result.elements.map(m => (m as MethodObj).name.name);
  } catch {
    return [];
  }
}

main();
