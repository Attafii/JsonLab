# JsonLab

JsonLab is a Next.js 14 JSON workbench for inspecting payloads, validating schemas, comparing documents, generating types, and creating mock data.

## Routes

- `/` main workspace for editing, tree/table/diff views, schema validation, type generation, import/export, history, and share links.
- `/ai` assistant for chat and code-fix workflows.
- `/mock-data` mock JSON generator with deterministic and AI-assisted modes.

## Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- shadcn/ui-style components built on Radix UI
- Framer Motion
- next-themes
- Monaco Editor

## Run It

```bash
npm install
npm run dev
```

## Environment

Optional AI support uses the following variables in `.env.local`:

- `NVIDIA_API_KEY`
- `NVIDIA_AI_MODEL`
- `NVIDIA_AI_URL`
