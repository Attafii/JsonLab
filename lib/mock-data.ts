import { type JsonValue, isJsonObject, safeStringifyJson } from '@/lib/json-utils';

function createSeededRandom(seed: number) {
  let value = seed % 2147483647;

  if (value <= 0) {
    value += 2147483646;
  }

  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

const firstNames = ['Avery', 'Jordan', 'Mina', 'Rowan', 'Harper', 'Sage', 'Theo', 'Lena'];
const lastNames = ['Carter', 'Wells', 'Nguyen', 'Patel', 'Bennett', 'Kim', 'Hughes', 'Reed'];
const cities = ['Portland', 'Austin', 'Toronto', 'Berlin', 'Madrid', 'Singapore'];
const companies = ['Northstar Labs', 'Luma Systems', 'Atlas Works', 'Vertex Studio'];
const statuses = ['draft', 'active', 'pending', 'scheduled', 'archived'];
const roles = ['Product Designer', 'Frontend Engineer', 'Data Analyst', 'Platform Lead'];
const adjectives = ['polished', 'robust', 'scalable', 'expressive', 'elegant', 'friendly'];

function pick<T>(options: T[], random: () => number) {
  return options[Math.floor(random() * options.length) % options.length];
}

function titleCase(input: string) {
  return input
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(' ');
}

function buildUuid(random: () => number) {
  const segment = () => Math.floor(random() * 0xffff)
    .toString(16)
    .padStart(4, '0');

  return `${segment()}${segment()}-${segment()}-${segment()}-${segment()}-${segment()}${segment()}${segment()}`;
}

function generateStringForKey(key: string, random: () => number) {
  const normalized = key.toLowerCase();

  if (normalized.includes('email')) {
    return `${pick(firstNames, random).toLowerCase()}.${pick(lastNames, random).toLowerCase()}@example.com`;
  }

  if (normalized.includes('first')) {
    return pick(firstNames, random);
  }

  if (normalized.includes('last')) {
    return pick(lastNames, random);
  }

  if (normalized.includes('name')) {
    return `${pick(firstNames, random)} ${pick(lastNames, random)}`;
  }

  if (normalized.includes('city')) {
    return pick(cities, random);
  }

  if (normalized.includes('country')) {
    return pick(['United States', 'Canada', 'Germany', 'Spain', 'Japan'], random);
  }

  if (normalized.includes('company')) {
    return pick(companies, random);
  }

  if (normalized.includes('status')) {
    return pick(statuses, random);
  }

  if (normalized.includes('role')) {
    return pick(roles, random);
  }

  if (normalized.includes('title')) {
    return `${pick(['Lead', 'Senior', 'Principal', 'Product'], random)} ${pick(['Designer', 'Engineer', 'Analyst', 'Architect'], random)}`;
  }

  if (normalized.includes('description') || normalized.includes('summary') || normalized.includes('bio')) {
    return `A ${pick(adjectives, random)} ${pick(['JSON payload', 'product story', 'workspace record', 'demo entry'], random)} for review.`;
  }

  if (normalized.includes('message') || normalized.includes('note')) {
    return `Generated ${pick(adjectives, random)} content for ${titleCase(key)}.`;
  }

  if (normalized.includes('url') || normalized.includes('link')) {
    return `https://example.com/${pick(['dashboard', 'records', 'projects', 'workspace'], random)}/${Math.floor(random() * 900 + 100)}`;
  }

  if (normalized.includes('avatar')) {
    return `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(pick(firstNames, random))}`;
  }

  if (normalized.includes('id') || normalized.includes('uuid')) {
    return buildUuid(random);
  }

  if (normalized.includes('date') || normalized.includes('time')) {
    const offset = Math.floor(random() * 365 * 24 * 60 * 60 * 1000);
    return new Date(Date.UTC(2026, 3, 20) - offset).toISOString();
  }

  if (normalized.includes('phone')) {
    return `+1 (555) ${Math.floor(random() * 900 + 100)}-${Math.floor(random() * 9000 + 1000)}`;
  }

  return `${titleCase(key)} ${Math.floor(random() * 900 + 100)}`;
}

function generateNumberForKey(key: string, random: () => number) {
  const normalized = key.toLowerCase();

  if (normalized.includes('price') || normalized.includes('amount') || normalized.includes('total')) {
    return Number((random() * 500 + 10).toFixed(2));
  }

  if (normalized.includes('age') || normalized.includes('count') || normalized.includes('quantity') || normalized.includes('index') || normalized.includes('score')) {
    return Math.floor(random() * 100);
  }

  return Number((random() * 1000).toFixed(0));
}

function transformValue(value: JsonValue, key: string, random: () => number): JsonValue {
  if (value === null) {
    return null;
  }

  if (typeof value === 'string') {
    return generateStringForKey(key, random);
  }

  if (typeof value === 'number') {
    return generateNumberForKey(key, random);
  }

  if (typeof value === 'boolean') {
    return random() > 0.5;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return [
        generateStringForKey(`${key}Item`, random),
        generateStringForKey(`${key}Item`, random),
        generateStringForKey(`${key}Item`, random)
      ];
    }

    return value.map((entry, index) => transformValue(entry as JsonValue, `${key}${index}`, random));
  }

  if (isJsonObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([entryKey, entryValue]) => [entryKey, transformValue(entryValue as JsonValue, entryKey, random)]));
  }

  return value;
}

export function generateMockJson(template: JsonValue, seed = 2026) {
  const random = createSeededRandom(seed);
  return transformValue(template, 'root', random);
}

export function generateMockJsonText(templateText: string, seed = 2026) {
  const template = JSON.parse(templateText) as JsonValue;
  const result = generateMockJson(template, seed);
  return safeStringifyJson(result, 2);
}

export function generateMockJsonCollection(template: JsonValue, count = 3, seed = 2026) {
  const random = createSeededRandom(seed);
  return Array.from({ length: count }, (_, index) => transformValue(template, `item${index}`, random));
}