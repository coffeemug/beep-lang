
# KNOWN BUGS

# NEXT
- Add some more methods to `enumerate` prototype (`filter`, `take_while`, etc.). 

# TODO (high risk):
- Variants and pattern matching
- Type system!
- require ! label to permit mutation in functions
- async/await
- label-based error handling
- good ffi
- gensym (and wellknowns for protocol use?)
- internal APIs kinda dirty; functions not exposed to beep; object relationship should be cleaner. I.e. struct list of fields should probably be a real Beep list. All this should be super clean.
- mixins (e.g. to auto-add enumeration methods based on `each`)
- protocols/contracts
- iterables
- decide on `coerce` vs `add`/`radd` approach

# TODO (low risk):
- Support for struct splicing, struct<->map integration
- Support for importing modules (and bindings generally)
- Support for algebraic operators
- Support booleans, boolean operators, and conditionals
- Types should be sealed or copy on write when changed outside defining module
- Add syntax highlighting, command to run files, maybe lsp
- Functions as methods bound to scopes is silly. Maybe have functions as first 
class objects and build methods on top of that.
- Native sets & set literals
- `structure.new(:foo, [:a, :b])` should work (though currently no way to set a binding at module toplevel.)
- repl support to reload modules

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
- Add mixin support so all iterables get methods like `map`
- Possibly add `protocol` abstraction (ended up being `prototype`)

