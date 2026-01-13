
To run the repl `bun src/main.ts`.

To try an example, once in the repl type `use examples/rpn/[rpn]`. Then call `rpn()`. This will give you an rpn calculator (e.g. you can do `10 RET 2 RET / RET quit RET` and get `5`.) The rpn calc program is in [examples/rpn.beep](https://github.com/coffeemug/beep-lang/blob/master/examples/rpn.beep).

Stubborn attachments:
1. Minimize the use of SHIFT key
2. Minimize useless indentation
3. Data structures are central, algorithms are peripheral
4. "What do I need here?" beats "what, philosophically, is this thing?"
5. Nominal data types, structural interfaces (I think)
6. Interfaces should be safe and rare
7. Discourage nerd-sniping
8. Clearly label mutation and blocking 


WIP