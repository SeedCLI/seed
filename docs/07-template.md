# @seedcli/template — Template Engine & File Generation

> File generation from templates using Eta (TypeScript, 3x faster than EJS).

**Package**: `@seedcli/template`
**Phase**: 2 (Toolbox Complete)
**Dependencies**: `eta`

---

## Overview

Provides template-based file generation for scaffolding tools. Wraps the Eta template engine which is:
- Written in TypeScript
- 3x faster than EJS
- EJS-compatible syntax (`<%= %>`)
- Custom delimiters supported
- Async-first
- Layout support

---

## File Structure

```
packages/template/
├── package.json
├── src/
│   ├── index.ts          # Public API
│   ├── engine.ts         # Eta engine configuration and wrapper
│   ├── generate.ts       # Single file generation
│   ├── directory.ts      # Directory scaffolding (generate multiple files)
│   └── types.ts          # Shared types
└── tests/
    ├── engine.test.ts
    ├── generate.test.ts
    └── directory.test.ts
```

---

## Public API

```ts
interface TemplateModule {
  // Generate a single file from a template file
  generate(options: GenerateOptions): Promise<string>;

  // Render a template string to a file
  render(options: RenderOptions): Promise<string>;

  // Render a template string and return the result (no file write)
  renderString(source: string, props?: Record<string, unknown>): Promise<string>;

  // Render a template file and return the result (no file write)
  renderFile(filePath: string, props?: Record<string, unknown>): Promise<string>;

  // Generate multiple files from a template directory
  directory(options: DirectoryOptions): Promise<string[]>;
}
```

---

## Template Syntax (Eta)

Eta uses EJS-compatible syntax with improvements:

### Variables

```
<%= it.name %>                    <!-- Output escaped -->
<%~ it.htmlContent %>              <!-- Output raw (unescaped) -->
```

Note: In Eta, template data is accessed via `it` (not raw variable names like EJS).

### JavaScript Logic

```
<% if (it.isPublic) { %>
  export const <%= it.name %> = ...
<% } else { %>
  const <%= it.name %> = ...
<% } %>
```

### Loops

```
<% it.props.forEach(prop => { %>
  <%= prop.name %>: <%= prop.type %>;
<% }) %>
```

### Async

```
<%= await it.fetchVersion() %>
```

### Comments

```
<%/* This is a comment */%>
```

### Custom Delimiters

Can be configured to use `{{ }}` instead of `<%= %>`:

```ts
// In engine config
const engine = new Eta({
  tags: ["{{", "}}"],
});
```

```
{{ it.name }}
{{~ it.rawHtml }}
```

---

## Single File Generation

### `generate(options)`

Generate one file from a template file.

```ts
interface GenerateOptions {
  template: string;                     // Path to template file (relative to templates dir)
  target: string;                       // Output path
  props?: Record<string, unknown>;      // Data passed to template
  directory?: string;                   // Templates base directory (default: "templates/")
  overwrite?: boolean;                  // Overwrite if exists (default: false)
}

// Example
await template.generate({
  template: "component.ts.eta",
  target: "src/components/Button.ts",
  props: {
    name: "Button",
    props: [
      { name: "label", type: "string" },
      { name: "onClick", type: "() => void" },
    ],
  },
});
```

### Template file example (`templates/component.ts.eta`):

```
import type { FC } from "react";

interface <%= it.name %>Props {
<% it.props.forEach(prop => { %>
  <%= prop.name %>: <%= prop.type %>;
<% }) %>
}

export const <%= it.name %>: FC<<%= it.name %>Props> = ({
<% it.props.forEach((prop, i) => { %>
  <%= prop.name %><%= i < it.props.length - 1 ? "," : "" %>
<% }) %>
}) => {
  return <div><%= it.name %></div>;
};
```

---

## Inline Template Rendering

### `render(options)`

Render from an inline template string and write to file.

```ts
interface RenderOptions {
  source: string;                       // Template string
  target: string;                       // Output path
  props?: Record<string, unknown>;
  overwrite?: boolean;
}

await template.render({
  source: `
export default {
  name: "<%= it.name %>",
  version: "<%= it.version %>",
};
  `.trim(),
  target: "config.ts",
  props: { name: "my-app", version: "1.0.0" },
});
```

### `renderString(source, props?)`

Render a template string and return the result without writing to disk.

```ts
const output = await template.renderString(
  "Hello, <%= it.name %>! You are <%= it.age %> years old.",
  { name: "Alice", age: 30 },
);
// "Hello, Alice! You are 30 years old."
```

### `renderFile(filePath, props?)`

Render a template file and return the result as a string, without writing to disk. Useful when you need the rendered output in memory.

```ts
const output = await template.renderFile("templates/component.ts.eta", {
  name: "Button",
  props: [{ name: "label", type: "string" }],
});
// Returns the rendered template as a string
```

---

## Directory Scaffolding

### `directory(options)`

Generate multiple files from a template directory. Processes all `.eta` files, copies non-template files as-is.

```ts
interface DirectoryOptions {
  source: string;                       // Source template directory
  target: string;                       // Output directory
  props?: Record<string, unknown>;
  overwrite?: boolean;
  ignore?: string[];                    // Glob patterns to skip
  rename?: Record<string, string>;      // Rename files: { "NAME.ts": `${name}.ts` }
}

await template.directory({
  source: "templates/project/",
  target: "./my-new-project/",
  props: { name: "my-app", version: "1.0.0", author: "Alice" },
});
```

### Template Directory Structure

```
templates/project/
├── package.json.eta          # → my-new-project/package.json
├── tsconfig.json             # → my-new-project/tsconfig.json  (copied as-is)
├── README.md.eta             # → my-new-project/README.md
├── src/
│   ├── index.ts.eta          # → my-new-project/src/index.ts
│   └── commands/
│       └── hello.ts.eta      # → my-new-project/src/commands/hello.ts
└── tests/
    └── hello.test.ts.eta     # → my-new-project/tests/hello.test.ts
```

**Rules:**
- Files ending in `.eta` are processed through Eta, output without `.eta` extension
- All other files are copied as-is
- Directory structure is preserved
- Empty directories are created

### Dynamic File Names

File names can contain template variables using `__varName__` syntax:

```
templates/component/
├── __name__.ts.eta           # → Button.ts (if props.name = "Button")
├── __name__.test.ts.eta      # → Button.test.ts
└── __name__.styles.ts.eta    # → Button.styles.ts
```

---

## Engine Configuration

The Eta engine is configured with sensible defaults:

```ts
const engine = new Eta({
  views: templatesDir,          // Base directory for templates
  cache: false,                 // Don't cache in dev
  autoEscape: false,            // Don't HTML-escape (we're generating code, not HTML)
  autoTrim: false,              // Preserve whitespace
  useWith: false,               // Use `it.` prefix (safer than `with`)
  async: true,                  // Enable async templates
});
```
