import type { BeepContext } from "../bootstrap/bootload";
import { exportBinding } from "../bootstrap/module";
import type { StringObj } from "../data_structures/string";
import { readSync } from "fs";

export function initIO(k: BeepContext) {
  const { makeModuleObj, intern, makeNativeFunctionObj, makeStringObj, makeIntObj } = k;

  const ioModule = makeModuleObj(intern('stdlib/io'));

  // readline: reads a single line from stdin synchronously
  const readlineFn = makeNativeFunctionObj(intern('readline'), 0, () => {
    const buf = Buffer.alloc(1024);
    let line = '';
    let bytesRead: number;

    // Read one byte at a time until we hit newline
    while (true) {
      try {
        bytesRead = readSync(0, buf, 0, 1, null);
      } catch {
        break;
      }
      if (bytesRead === 0) break;
      const char = buf.toString('utf8', 0, 1);
      if (char === '\n') break;
      line += char;
    }

    return makeStringObj(line);
  });
  exportBinding(ioModule, intern('readline'), readlineFn);

  // print: prints a string to stdout
  const printFn = makeNativeFunctionObj(intern('print'), 1, (args) => {
    if (args[0].tag !== 'StringObj') {
      throw new Error(`print requires a string, got ${k.show(args[0])}`);
    }
    const str = (args[0] as StringObj).value;
    process.stdout.write(`${str}\n`);
    return makeIntObj(0n);
  });
  exportBinding(ioModule, intern('print'), printFn);
}
