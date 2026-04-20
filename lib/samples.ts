export const SAMPLE_PRIMARY_JSON = `{
  "project": "JsonLab",
  "version": 1,
  "owner": {
    "name": "Mina Carter",
    "email": "mina.carter@example.com",
    "role": "Frontend Engineer"
  },
  "features": [
    "JSON tree view",
    "schema validation",
    "type generation",
    "mock data"
  ],
  "metrics": {
    "records": 128,
    "active": true,
    "lastUpdated": "2026-04-20T10:30:00.000Z"
  }
}`;

export const SAMPLE_COMPARE_JSON = `{
  "project": "JsonLab",
  "version": 2,
  "owner": {
    "name": "Mina Carter",
    "email": "mina.carter@example.com",
    "role": "Frontend Engineer",
    "team": "Platform"
  },
  "features": [
    "JSON tree view",
    "schema validation",
    "type generation",
    "mock data",
    "shareable links"
  ],
  "metrics": {
    "records": 156,
    "active": true,
    "lastUpdated": "2026-04-21T08:00:00.000Z"
  }
}`;

export const SAMPLE_SCHEMA_JSON = `{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "project": { "type": "string" },
    "version": { "type": "number" },
    "owner": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "email": { "type": "string" },
        "role": { "type": "string" }
      },
      "required": ["name", "email", "role"],
      "additionalProperties": false
    },
    "features": {
      "type": "array",
      "items": { "type": "string" }
    },
    "metrics": {
      "type": "object",
      "properties": {
        "records": { "type": "number" },
        "active": { "type": "boolean" },
        "lastUpdated": { "type": "string" }
      },
      "required": ["records", "active", "lastUpdated"],
      "additionalProperties": false
    }
  },
  "required": ["project", "version", "owner", "features", "metrics"],
  "additionalProperties": false
}`;