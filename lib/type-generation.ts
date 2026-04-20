import { isJsonObject, type JsonObject, type JsonValue, jsonTypeOf, safeStringifyJson } from '@/lib/json-utils';

type Schema = Record<string, unknown>;

interface DartFieldDefinition {
  name: string;
  type: string;
  jsonKey: string;
  optional: boolean;
}

interface DartClassDefinition {
  name: string;
  fields: DartFieldDefinition[];
}

export interface TypeArtifacts {
  typescript: string;
  dart: string;
  rootName: string;
}

function pascalCase(input: string) {
  return input
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('') || 'JsonLabItem';
}

function camelCase(input: string) {
  const pascal = pascalCase(input);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function sanitizeIdentifier(input: string) {
  const sanitized = input.replace(/[^a-zA-Z0-9_]/g, '_');
  return /^[A-Za-z_]/.test(sanitized) ? sanitized : `field_${sanitized}`;
}

function quoteTsKey(key: string) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
}

function literalToTs(value: string | number | boolean | null) {
  return value === null ? 'null' : typeof value === 'string' ? JSON.stringify(value) : String(value);
}

function inferTsFromValue(value: JsonValue): string {
  if (value === null) {
    return 'null';
  }

  if (typeof value === 'string') {
    return 'string';
  }

  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'number' : 'number';
  }

  if (typeof value === 'boolean') {
    return 'boolean';
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return 'unknown[]';
    }

    const itemTypes = Array.from(new Set(value.map((entry) => inferTsFromValue(entry as JsonValue))));
    return `${itemTypes.length === 1 ? itemTypes[0] : itemTypes.join(' | ')}[]`;
  }

  const entries = Object.entries(value);
  if (entries.length === 0) {
    return '{}';
  }

  const lines = entries.map(([key, entry]) => `${quoteTsKey(key)}: ${inferTsFromValue(entry as JsonValue)};`);
  return `{ ${lines.join(' ')} }`;
}

function inferTsFromSchema(schema: Schema | undefined): string {
  if (!schema || typeof schema !== 'object') {
    return 'unknown';
  }

  if ('const' in schema) {
    return literalToTs(schema.const as string | number | boolean | null);
  }

  if (Array.isArray(schema.enum)) {
    const literals = schema.enum
      .filter((entry) => ['string', 'number', 'boolean'].includes(typeof entry) || entry === null)
      .map((entry) => literalToTs(entry as string | number | boolean | null));
    return literals.length > 0 ? literals.join(' | ') : 'unknown';
  }

  if (Array.isArray(schema.oneOf)) {
    return schema.oneOf.map((entry) => inferTsFromSchema(entry as Schema)).join(' | ');
  }

  if (Array.isArray(schema.anyOf)) {
    return schema.anyOf.map((entry) => inferTsFromSchema(entry as Schema)).join(' | ');
  }

  if (Array.isArray(schema.allOf)) {
    return schema.allOf.map((entry) => inferTsFromSchema(entry as Schema)).join(' & ');
  }

  const type = schema.type;
  if (Array.isArray(type)) {
    return type.map((entry) => inferTsFromSchema({ ...schema, type: entry })).join(' | ');
  }

  if (type === 'string') {
    return 'string';
  }

  if (type === 'number' || type === 'integer') {
    return 'number';
  }

  if (type === 'boolean') {
    return 'boolean';
  }

  if (type === 'null') {
    return 'null';
  }

  if (type === 'array' || schema.items) {
    const itemType = inferTsFromSchema((schema.items as Schema) ?? {});
    return `Array<${itemType}>`;
  }

  const properties = schema.properties as Record<string, Schema> | undefined;
  if (type === 'object' || properties) {
    const required = new Set((schema.required as string[] | undefined) ?? []);
    const entries = Object.entries(properties ?? {});
    const renderedEntries = entries.map(([key, entry]) => `${quoteTsKey(key)}${required.has(key) ? '' : '?'}: ${inferTsFromSchema(entry)};`);

    if (schema.additionalProperties && schema.additionalProperties !== false) {
      renderedEntries.push(`[key: string]: ${inferTsFromSchema(schema.additionalProperties as Schema)};`);
    }

    return `{ ${renderedEntries.join(' ')} }`;
  }

  return 'unknown';
}

function camelIdentifier(name: string) {
  const sanitized = sanitizeIdentifier(camelCase(name));
  return sanitized;
}

function buildDartClassName(baseName: string, suffix: string) {
  return `${pascalCase(baseName)}${pascalCase(suffix)}`;
}

function inferDartPrimitive(value: JsonValue) {
  if (value === null) {
    return 'dynamic';
  }

  if (typeof value === 'string') {
    return 'String';
  }

  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'int' : 'double';
  }

  if (typeof value === 'boolean') {
    return 'bool';
  }

  return 'dynamic';
}

function inferDartTypeFromValue(value: JsonValue, className: string, definitions: DartClassDefinition[], classNames: Set<string>): string {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return inferDartPrimitive(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return 'List<dynamic>';
    }

    const itemTypes = Array.from(new Set(value.map((entry) => inferDartTypeFromValue(entry as JsonValue, `${className}Item`, definitions, classNames))));
    const itemType = itemTypes.length === 1 ? itemTypes[0] : 'dynamic';
    return `List<${itemType}>`;
  }

  const nestedClassName = ensureUniqueClassName(buildDartClassName(className, 'Item'), classNames);
  definitions.push(buildDartClassFromValue(nestedClassName, value as JsonObject, definitions, classNames));
  return nestedClassName;
}

function ensureUniqueClassName(baseName: string, classNames: Set<string>) {
  let candidate = baseName;
  let counter = 2;

  while (classNames.has(candidate)) {
    candidate = `${baseName}${counter}`;
    counter += 1;
  }

  classNames.add(candidate);
  return candidate;
}

function buildDartClassFromValue(name: string, value: JsonObject, definitions: DartClassDefinition[], classNames: Set<string>): DartClassDefinition {
  const fields: DartFieldDefinition[] = [];

  for (const [key, entry] of Object.entries(value)) {
    const fieldName = sanitizeIdentifier(camelIdentifier(key));
    const fieldClassName = buildDartClassName(name, key);

    const fieldType = (() => {
      if (entry === null || typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean') {
        return inferDartPrimitive(entry);
      }

      if (Array.isArray(entry)) {
        if (entry.length === 0) {
          return 'List<dynamic>';
        }

        const itemTypes = Array.from(new Set(entry.map((item) => inferDartTypeFromValue(item as JsonValue, fieldClassName, definitions, classNames))));
        const itemType = itemTypes.length === 1 ? itemTypes[0] : 'dynamic';
        return `List<${itemType}>`;
      }

      const nestedName = ensureUniqueClassName(fieldClassName, classNames);
      definitions.push(buildDartClassFromValue(nestedName, entry as JsonObject, definitions, classNames));
      return nestedName;
    })();

    fields.push({
      name: fieldName,
      type: fieldType,
      jsonKey: key,
      optional: false
    });
  }

  return { name, fields };
}

function inferDartTypeFromSchema(schema: Schema | undefined, name: string, definitions: DartClassDefinition[], classNames: Set<string>, required = true): string {
  if (!schema || typeof schema !== 'object') {
    return 'dynamic';
  }

  if ('const' in schema || Array.isArray(schema.enum)) {
    const enumType = inferTsFromSchema(schema);
    if (enumType === 'string') return 'String';
    if (enumType === 'number') return 'double';
    if (enumType === 'boolean') return 'bool';
    return 'dynamic';
  }

  if (Array.isArray(schema.oneOf) || Array.isArray(schema.anyOf) || Array.isArray(schema.allOf)) {
    return 'dynamic';
  }

  const type = schema.type;
  if (Array.isArray(type)) {
    const narrowed = type.filter((entry) => entry !== 'null');
    if (narrowed.length === 1) {
      return inferDartTypeFromSchema({ ...schema, type: narrowed[0] as string }, name, definitions, classNames, required);
    }

    return 'dynamic';
  }

  if (type === 'string') {
    return 'String';
  }

  if (type === 'number') {
    return 'double';
  }

  if (type === 'integer') {
    return 'int';
  }

  if (type === 'boolean') {
    return 'bool';
  }

  if (type === 'null') {
    return 'dynamic';
  }

  if (type === 'array' || schema.items) {
    const itemType = inferDartTypeFromSchema(schema.items as Schema | undefined, `${name}Item`, definitions, classNames, true);
    return `List<${itemType}>`;
  }

  const properties = schema.properties as Record<string, Schema> | undefined;
  if (type === 'object' || properties) {
    const nestedName = ensureUniqueClassName(name, classNames);
    const requiredFields = new Set((schema.required as string[] | undefined) ?? []);
    const classDefinition: DartClassDefinition = {
      name: nestedName,
      fields: Object.entries(properties ?? {}).map(([key, entry]) => ({
        name: sanitizeIdentifier(camelIdentifier(key)),
        type: inferDartTypeFromSchema(entry, buildDartClassName(nestedName, key), definitions, classNames, requiredFields.has(key)),
        jsonKey: key,
        optional: !requiredFields.has(key)
      }))
    };

    if (schema.additionalProperties && schema.additionalProperties !== false) {
      classDefinition.fields.push({
        name: 'additionalProperties',
        type: `Map<String, ${inferDartTypeFromSchema(schema.additionalProperties as Schema, `${nestedName}AdditionalProperty`, definitions, classNames)}>`,
        jsonKey: '',
        optional: true
      });
    }

    definitions.push(classDefinition);
    return nestedName;
  }

  return 'dynamic';
}

function renderDartClass(definition: DartClassDefinition) {
  const constructorFields = definition.fields
    .filter((field) => field.name !== 'additionalProperties')
    .map((field) => `${field.optional ? '' : 'required '}this.${field.name}`)
    .join(', ');

  const fields = definition.fields.map((field) => `  final ${field.type}${field.optional ? '?' : ''} ${field.name};`).join('\n');

  const fromJsonFields = definition.fields
    .map((field) => {
      if (field.name === 'additionalProperties') {
        return '';
      }

      const jsonAccessor = `json['${field.jsonKey}']`;
      if (field.type.startsWith('List<')) {
        const innerType = field.type.slice(5, -1);
        if (innerType === 'String' || innerType === 'int' || innerType === 'double' || innerType === 'bool' || innerType === 'dynamic') {
          return `${field.name}: (${jsonAccessor} as List<dynamic>?)?.map((item) => item as ${innerType}).toList()${field.optional ? '' : ' ?? const []'},`;
        }

        return `${field.name}: (${jsonAccessor} as List<dynamic>?)?.map((item) => ${innerType}.fromJson(item as Map<String, dynamic>)).toList()${field.optional ? '' : ' ?? const []'},`;
      }

      if (['String', 'int', 'double', 'bool'].includes(field.type)) {
        return `${field.name}: ${jsonAccessor} as ${field.type}${field.optional ? '?' : ''},`;
      }

      if (field.type === 'dynamic') {
        return `${field.name}: ${jsonAccessor},`;
      }

      return `${field.name}: ${jsonAccessor} != null ? ${field.type}.fromJson(${jsonAccessor} as Map<String, dynamic>) : null,`;
    })
    .filter(Boolean)
    .join('\n    ');

  const toJsonFields = definition.fields
    .filter((field) => field.name !== 'additionalProperties')
    .map((field) => {
      if (field.type.startsWith('List<')) {
        const innerType = field.type.slice(5, -1);
        if (['String', 'int', 'double', 'bool', 'dynamic'].includes(innerType)) {
          return `    '${field.jsonKey}': ${field.name},`;
        }

        return `    '${field.jsonKey}': ${field.name}${field.optional ? '?' : ''}.map((item) => item.toJson()).toList(),`;
      }

      if (['String', 'int', 'double', 'bool', 'dynamic'].includes(field.type)) {
        return `    '${field.jsonKey}': ${field.name},`;
      }

      return `    '${field.jsonKey}': ${field.name}${field.optional ? '?' : ''}.toJson(),`;
    })
    .join('\n');

  return `class ${definition.name} {\n  const ${definition.name}({${constructorFields}});\n\n${fields}\n\n  factory ${definition.name}.fromJson(Map<String, dynamic> json) {\n    return ${definition.name}(\n    ${fromJsonFields}\n    );\n  }\n\n  Map<String, dynamic> toJson() {\n    return {\n${toJsonFields}\n    };\n  }\n}`;
}

function buildTypeScriptFromValue(value: JsonValue, rootName: string) {
  const ts = `export type ${rootName} = ${inferTsFromValue(value)};`;
  return ts;
}

function buildTypeScriptFromSchema(schema: Schema, rootName: string) {
  const ts = `export type ${rootName} = ${inferTsFromSchema(schema)};`;
  return ts;
}

function buildDartFromValue(value: JsonValue, rootName: string) {
  const classNames = new Set<string>([rootName]);
  const definitions: DartClassDefinition[] = [];
  const rootDefinition = buildDartClassFromValue(rootName, (isJsonObject(value) ? value : { value }) as JsonObject, definitions, classNames);

  if (definitions.length === 0) {
    definitions.push(rootDefinition);
  } else {
    definitions.unshift(rootDefinition);
  }

  const uniqueDefinitions = Array.from(new Map(definitions.map((definition) => [definition.name, definition])).values());
  return uniqueDefinitions.map(renderDartClass).join('\n\n');
}

function buildDartFromSchema(schema: Schema, rootName: string) {
  const classNames = new Set<string>([rootName]);
  const definitions: DartClassDefinition[] = [];

  const rootType = inferDartTypeFromSchema(schema, rootName, definitions, classNames);
  if (rootType !== rootName && !definitions.some((definition) => definition.name === rootName)) {
    definitions.unshift({
      name: rootName,
      fields: [{ name: 'value', type: rootType, jsonKey: 'value', optional: false }]
    });
  }

  const uniqueDefinitions = Array.from(new Map(definitions.map((definition) => [definition.name, definition])).values());
  return uniqueDefinitions.map(renderDartClass).join('\n\n');
}

export function generateTypeArtifactsFromJson(value: JsonValue, rootName = 'JsonLabItem'): TypeArtifacts {
  const normalizedRoot = pascalCase(rootName);
  return {
    typescript: buildTypeScriptFromValue(value, normalizedRoot),
    dart: buildDartFromValue(value, normalizedRoot),
    rootName: normalizedRoot
  };
}

export function generateTypeArtifactsFromSchema(schema: Schema, rootName = 'JsonLabItem'): TypeArtifacts {
  const normalizedRoot = pascalCase(rootName);
  return {
    typescript: buildTypeScriptFromSchema(schema, normalizedRoot),
    dart: buildDartFromSchema(schema, normalizedRoot),
    rootName: normalizedRoot
  };
}

export function generateTypeArtifacts(source: JsonValue | Schema, rootName = 'JsonLabItem'): TypeArtifacts {
  if (isJsonObject(source) && (source.type || source.properties || source.items || source.enum || source.oneOf || source.anyOf || source.allOf)) {
    return generateTypeArtifactsFromSchema(source, rootName);
  }

  return generateTypeArtifactsFromJson(source as JsonValue, rootName);
}

export function describeTypeArtifacts(artifacts: TypeArtifacts) {
  return safeStringifyJson({ rootName: artifacts.rootName, typescriptLines: artifacts.typescript.split('\n').length, dartLines: artifacts.dart.split('\n').length }, 2);
}