export type WorkspaceSampleId = 'api-payload' | 'nested-config' | 'schema-validation';
export type WorkspaceSampleOutputTab = 'tree' | 'diff' | 'types';
export type WorkspaceSampleAccent = 'sky' | 'emerald' | 'violet';

export interface WorkspaceSample {
  id: WorkspaceSampleId;
  title: string;
  description: string;
  badge: string;
  highlights: string[];
  primaryText: string;
  compareText?: string;
  schemaText?: string;
  outputTab: WorkspaceSampleOutputTab;
  accent: WorkspaceSampleAccent;
}

const apiPayloadPrimary = `{
  "requestId": "req_8f12c4",
  "endpoint": "/v1/orders",
  "method": "POST",
  "status": 200,
  "user": {
    "id": "user_102",
    "name": "Mina Carter",
    "email": "mina.carter@example.com"
  },
  "items": [
    { "sku": "pro-plan", "qty": 1, "price": 24.99 },
    { "sku": "support-addon", "qty": 1, "price": 9.99 }
  ],
  "meta": {
    "region": "us-east-1",
    "requestTimeMs": 184,
    "cached": false
  }
}`;

const apiPayloadCompare = `{
  "requestId": "req_8f12c4",
  "endpoint": "/v1/orders",
  "method": "POST",
  "status": 201,
  "user": {
    "id": "user_102",
    "name": "Mina Carter",
    "email": "mina.carter@example.com"
  },
  "items": [
    { "sku": "pro-plan", "qty": 1, "price": 24.99 },
    { "sku": "support-addon", "qty": 1, "price": 9.99 },
    { "sku": "priority-review", "qty": 1, "price": 14.99 }
  ],
  "meta": {
    "region": "us-east-1",
    "requestTimeMs": 196,
    "cached": false,
    "source": "api"
  }
}`;

const nestedConfigPrimary = `{
  "app": {
    "name": "JsonLab",
    "theme": {
      "mode": "dark",
      "accent": "cyan",
      "density": "comfortable"
    },
    "shortcuts": ["Ctrl+K", "Ctrl+S", "Ctrl+P"]
  },
  "editor": {
    "language": "json",
    "tabSize": 2,
    "features": {
      "lintOnType": true,
      "formatOnSave": true,
      "autoFold": false
    }
  },
  "services": [
    { "name": "storage", "enabled": true },
    { "name": "sharing", "enabled": true },
    { "name": "analytics", "enabled": false }
  ],
  "limits": {
    "maxHistory": 12,
    "maxSizeMB": 5,
    "maxNodes": 1200
  }
}`;

const schemaValidationPrimary = `{
  "id": "project-1",
  "name": "JsonLab",
  "owner": {
    "name": "Amina",
    "email": "amina@example.com"
  },
  "tags": ["json", "workbench", "schema"],
  "published": true
}`;

const schemaValidationSchema = `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "additionalProperties": false,
  "required": ["id", "name", "owner", "tags", "published"],
  "properties": {
    "id": { "type": "string" },
    "name": { "type": "string" },
    "owner": {
      "type": "object",
      "additionalProperties": false,
      "required": ["name", "email"],
      "properties": {
        "name": { "type": "string" },
        "email": { "type": "string" }
      }
    },
    "tags": {
      "type": "array",
      "items": { "type": "string" }
    },
    "published": { "type": "boolean" }
  }
}`;

export const WORKSPACE_SAMPLES: WorkspaceSample[] = [
  {
    id: 'api-payload',
    title: 'API Payload',
    description: 'Inspect a request payload and compare it with a newer response shape.',
    badge: 'Diff-ready',
    highlights: ['Primary + compare', 'Fast diff review', 'Debug API changes'],
    primaryText: apiPayloadPrimary,
    compareText: apiPayloadCompare,
    outputTab: 'diff',
    accent: 'sky'
  },
  {
    id: 'nested-config',
    title: 'Nested Config',
    description: 'Explore a layered settings object with arrays, feature flags, and limits.',
    badge: 'Tree-first',
    highlights: ['Deep tree', 'Nested objects', 'Realistic settings'],
    primaryText: nestedConfigPrimary,
    outputTab: 'tree',
    accent: 'emerald'
  },
  {
    id: 'schema-validation',
    title: 'Schema Validation',
    description: 'Load a matching JSON document and schema to validate and generate types.',
    badge: 'Contract-ready',
    highlights: ['JSON + schema', 'Validation pass', 'Type output'],
    primaryText: schemaValidationPrimary,
    schemaText: schemaValidationSchema,
    outputTab: 'types',
    accent: 'violet'
  }
];

export const SAMPLE_PRIMARY_JSON = WORKSPACE_SAMPLES[0].primaryText;
export const SAMPLE_COMPARE_JSON = WORKSPACE_SAMPLES[0].compareText ?? '';
export const SAMPLE_SCHEMA_JSON = WORKSPACE_SAMPLES[2].schemaText ?? '';
