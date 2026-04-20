# JsonLab

JsonLab is a modern JSON workbench for inspecting payloads, validating schemas, comparing documents, generating types, and creating mock data.

## Routes

- `/` main workspace for editing, tree/table/diff views, schema validation, type generation, import/export, history, and share links.
- `/ai` assistant for chat and code-fix workflows.
- `/mock-data` mock JSON generator with deterministic and assisted modes.

## Run It

```bash
npm install
npm run dev
```

## Environment

Optional remote AI support uses the following variables in `.env.local`:

- `AI_API_KEY`
- `AI_MODEL`
- `AI_API_URL`
