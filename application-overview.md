# JSON Master Application Overview

JSON Master is a structured JSON workbench for developers, analysts, and product teams who need to inspect JSON, compare payloads, validate contracts, generate types, and create realistic mock data without switching tools.

The app is organized into three main routes:

- `/` for the main JSON workspace.
- `/ai` for an AI assistant and code-fix workflow.
- `/mock-data` for generating sample JSON with or without AI.

## What The App Does

At a high level, JSON Master helps users move from raw JSON to usable developer artifacts:

- Parse and inspect JSON documents in a structured tree view.
- Compare two JSON documents and see exactly what changed.
- Validate primary JSON against a JSON Schema.
- Generate TypeScript and Dart models from JSON or schema.
- Import and export JSON, schema, and generated output.
- Keep a history of snapshots so users can undo and redo complex editing sessions.
- Ask an AI assistant questions about the app or get help fixing code snippets.
- Generate mock JSON data from a template for testing and prototyping.

## Main Workspace

The home route is the core of the product. It acts like a JSON command center with a left navigation rail, a central workspace, and a supporting feature dock.

### Input And Parsing

The primary JSON editor is the source of truth for the workspace.

- It uses Monaco Editor for syntax highlighting and editing.
- JSON is parsed live as the user types.
- Parse errors are shown immediately so broken input is easy to spot.
- The workspace keeps a sample document loaded by default so the screen is useful on first open.

### Tree Visualization

Once JSON is valid, the app renders it as a recursive node tree.

- Objects and arrays expand into nested cards.
- Individual nodes show labels, kinds, previews, and path information.
- Users can select nodes, expand or collapse branches, and pin a path to keep it visible while navigating.
- A breadcrumb-style path navigator helps users move through deeply nested data.
- Search keeps ancestor paths open so matching branches stay visible.

### Diff View

The app can compare a primary JSON document with a second comparison document.

- Added, removed, changed, and unchanged rows are computed automatically.
- The diff view highlights structural differences and value changes.
- A search box filters diff rows by label, path, summary, or preview.
- Virtualization keeps large comparisons responsive.

### Schema Validation

Users can paste a JSON Schema to validate the primary JSON document.

- The schema is parsed live.
- Validation runs against the primary JSON when both inputs are valid.
- Validation errors are shown in the workspace rail.
- When a schema is available, the type drawer can generate models from the schema rather than from the raw JSON.

### Type Generation

JSON Master generates code from structured data.

- TypeScript interfaces are generated from the currently loaded JSON or schema.
- Dart classes are generated for Flutter-style model usage.
- The generated code includes object structure, field names, optional properties, and nested types where possible.
- Users can copy the active format or open the type drawer to inspect the output.

### Import, Export, And History

The app is built for iterative editing.

- JSON and comparison JSON can be imported from files.
- The current JSON, comparison JSON, and schema can be downloaded.
- Snapshots preserve workspace state across edits.
- Undo and redo move through saved snapshots.
- Recent documents make it easier to return to imported content.

### Navigation And Theme Controls

The left rail is more than navigation.

- It switches between the workspace, AI assistant, and mock data generator.
- It lets users toggle light and dark mode.
- It includes theme presets that adjust the visual surface style.
- Keyboard shortcuts support faster navigation and output copy actions.

## AI Assistant Route

The `/ai` route provides an AI-powered companion for the app.

### Chat Mode

In chat mode, the assistant answers questions about the app, JSON workflows, schema validation, and UI behavior.

- Users can ask how to use the workspace.
- The assistant can explain features or help clarify implementation details.
- Messages are sent through a server route so the browser does not need direct access to the AI provider.

### Code Fix Mode

In code-fix mode, the assistant reviews a snippet and returns a corrected version.

- Users provide a snippet and a short instruction.
- The assistant is prompted to make minimal, practical changes.
- The response includes an explanation plus corrected code.

### AI Transport

- Requests go through `/api/ai`.
- The route uses the NVIDIA AI integration configured by environment variables.
- The app expects a local `.env.local` file with `NVIDIA_API_KEY` and optionally `NVIDIA_AI_MODEL`.

## Mock Data Route

The `/mock-data` route creates structured sample JSON for demos, testing, and UI development.

### Without AI

The non-AI mode generates repeatable mock data from a template.

- The template JSON defines the shape of the output.
- The generator keeps field structure intact.
- String fields are made more realistic using key-based heuristics such as name, email, status, or role.
- The output is deterministic enough to be useful for consistent prototypes.

### With AI

The AI mode can create richer mock data from a prompt and a template.

- Users describe the dataset they want.
- The template guides the structure.
- The model returns JSON intended to be valid and production-like.
- The output is normalized when possible so the result can be copied directly into a project.

## Why The App Is Useful

JSON Master is useful when working with structured data that needs to be understood quickly and reused safely.

- API debugging: inspect payloads and compare versions.
- Contract work: validate JSON against schemas before handing data to another system.
- Frontend and mobile modeling: generate TypeScript or Dart models from real data.
- Prototyping: create realistic mock records without hand-writing every field.
- Review and maintenance: navigate deeply nested documents without losing context.
- AI assistance: get help with app usage or snippet repair without leaving the workspace.

## Technical Shape Of The App

The implementation is a Next.js 14 application with a client-heavy workspace.

- React and Next.js App Router power the routes.
- Zustand stores the shared JSON, schema, view, theme, and history state.
- Monaco Editor handles structured editing.
- Framer Motion provides subtle transitions.
- The tree and diff views use recursive rendering and virtualization to stay usable on larger documents.

## Summary

JSON Master is not just a viewer. It is a JSON productivity app that combines editing, inspection, comparison, validation, code generation, mock data creation, and AI assistance in one workflow.