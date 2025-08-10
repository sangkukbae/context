## Using Gemini CLI for Large Codebase Analysis

When analyzing large codebases or multiple files that might exceed context limits, use the Gemini CLI with its massive context window. Use `gemini -p` to leverage Google Gemini's large context capacity.

### File and Directory Inclusion Syntax

Use the `@` syntax to include files and directories in your Gemini prompts. The paths should be relative to WHERE you run the gemini command:

**Single file analysis:**

```
gemini -p "@src/main.py Explain this file's purpose and structure"
```

**Multiple files:**

```
gemini -p "@package.json @src/index.js Analyze the dependencies used in the code"
```

**Entire directory:**

```
gemini -p "@src/ Summarize the architecture of this codebase"
```

**Multiple directories:**

```
gemini -p "@src/ @tests/ Analyze test coverage for the source code"
```

**Current directory and subdirectories:**

```
gemini -p "@./ Give me an overview of this entire project"
# Or use --all_files flag:
gemini --all_files -p "Analyze the project structure and dependencies"
```

### Implementation Verification Examples

Check if a feature is implemented:

```
gemini -p "@src/ @lib/ Has dark mode been implemented in this codebase? Show me the relevant files and functions"
```

Verify authentication implementation:

```
gemini -p "@src/ @middleware/ Is JWT authentication implemented? List all auth-related endpoints and middleware"
```

Check for specific patterns:

```
gemini -p "@src/ Are there any React hooks that handle WebSocket connections? List them with file paths"
```
