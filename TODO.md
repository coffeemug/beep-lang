
# KNOWN BUGS

# NEXT
- Better function definition/calling
  - Lambda lists (positional, optional, keyword args)
  - Combine contiguous function definitions into pattern matching cases

# TODO (high risk):
- The whole struct/ADT thing. Maybe maps autocast to structs? Or are struct-like? Idk, there's gotta be a good way to do this.
- Type system!
- require ! label to permit mutation in functions
- async/await
- label-based error handling?
- good ffi
- gensym (and wellknowns for protocol use?)
- internal APIs kinda dirty; functions not exposed to beep; object relationship should be cleaner. I.e. struct list of fields should probably be a real Beep list. All this should be super clean.
- protocols/contracts
- decide on `coerce` vs `add`/`radd` approach
- If I define `int/foo` I can't say `int.foo` and get an unbound method. Also, `1.methods()` returns unbound methods. All this is conceptually right but empirically confusing.
- `while let`? I really dislike this, but there is a better way maybe?
- However errors are handled, need a signal system to implement `break`/`return` in interpreters
- Implement division

# TODO (low risk):
- Implicit tuples (e.g. `for x, y in some_map do ...`)
- Have an actual `unit/()` object. Some things should return nothing, like `rpn/[main]`. I.e. unit can't be 0.
- Parser error on `let x = case ...` or on assignments in cases.
- Support for struct splicing, struct<->map integration
- Support booleans
- Types should be sealed or copy on write when changed outside defining module
- Add syntax highlighting, command to run files, maybe lsp
- Native sets & set literals
- `structure.new(:foo, [:a, :b])` should work (though currently no way to set a binding at module toplevel.)
- Make iterators enumerable (requires some function rewrites to not consume extra elements)
- Add comments support to make visual grouping possible
- clean up O(N^2) impelementations in `enum`
- add own method definition syntax (e.g. `def list/@@zip() ...`)
- repl support to reload modules (in an actually usable way)

# DONE
- Support for functions (i.e. module methods) as outlined above.
- Repl should operate in a `repl` module that autoimports all the kernel module bindings.
- There should be a way to create modules plus switch the repl to different modules.
- A bunch of code is still very unwieldy. Primarily: passing state around (and not having access to the right state in many places), registering native methods, calling methods on Beep objects inside the interpreter, etc. This should all be much more ergonomic.
- Add own method machinery to allow things like `module.new('math')`.
- Support for `let` blocks
- Assignment
- Support for structs
- @ sigil for member access
- equality operator
- Loops
- Get FizzBuzz working
- Iterators now supported on lists/ranges and in for loops
- mixins (e.g. to auto-add enumeration methods based on `each`)
- Add mixin support so all iterables get methods like `map`
- Possibly add `protocol` abstraction (ended up being `prototype`)
- Add some more methods to `enumerate` prototype (`filter`, `take_while`, etc.)
- iterables
- Support for importing modules (and bindings generally)
- Support for algebraic operators
- Support boolean operators, and conditionals
- Basic pattern matching machinery
- break, return
- Add known unit value to beep context
- Modules should expose `get_field` and ability to list bindings.
- Multidimensional arrays syntax (for the tic-tac-toe problem)
- Added `{a, b // 2 }` form of pattern matching.