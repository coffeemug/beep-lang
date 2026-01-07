# Beep Language Support for VS Code

Syntax highlighting for the Beep programming language.

## Features

- Syntax highlighting for `.beep` files
- Comment toggling with `#`
- Auto-closing brackets and quotes
- Code folding for blocks (`def`/`end`, `struct`/`end`, etc.)

## Installation

### From source (development)

1. Copy or symlink this folder to your VS Code extensions directory:
   - **macOS/Linux**: `~/.vscode/extensions/beep-language`
   - **Windows**: `%USERPROFILE%\.vscode\extensions\beep-language`

2. Restart VS Code

### Quick install (macOS/Linux)

```bash
ln -s "$(pwd)" ~/.vscode/extensions/beep-language
```

## Syntax Highlighting

The extension highlights:

- **Keywords**: `def`, `end`, `let`, `struct`, `if`, `then`, `elif`, `else`, `for`, `in`, `do`, `and`, `or`
- **Strings**: `'single quoted'`
- **Numbers**: integer literals
- **Symbols**: `:symbol_name`
- **Dynamic variables**: `$var`
- **Member variables**: `@field`
- **Operators**: `+`, `-`, `*`, `%`, `==`, `<`, `<=`, `>`, `>=`, `..`, `..=`
- **Function calls**: `name()`, `name!()`
- **Method definitions**: `def Type/method()` and `def function()`
- **Struct definitions**: `struct Name ... end`
- **Comments**: `# line comment`
