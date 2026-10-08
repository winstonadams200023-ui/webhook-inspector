function decodePointer(pointer) {
  if (!pointer) return [];
  return pointer
    .split('/')
    .slice(1)
    .map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'));
}

function getAtPath(value, path) {
  return path.reduce((current, part) => {
    if (current === null || typeof current !== 'object' || !Object.hasOwn(current, part)) {
      return undefined;
    }
    return current[part];
  }, value);
}

function getParentAtPath(value, path) {
  if (path.length === 0) return { parent: null, key: null };
  return {
    parent: getAtPath(value, path.slice(0, -1)),
    key: path[path.length - 1],
  };
}

function setOwnProperty(target, key, value) {
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: true,
    writable: true,
    value,
  });
}

function schemaAtPath(schema, path) {
  return path.reduce((current, part) => {
    if (!current || typeof current !== 'object') return null;
    if (Array.isArray(current)) return null;
    if (/^(0|[1-9]\d*)$/.test(part) && current.items) return current.items;
    if (
      current.properties &&
      typeof current.properties === 'object' &&
      Object.hasOwn(current.properties, part)
    ) {
      return current.properties[part];
    }
    return current.additionalProperties ?? null;
  }, schema);
}

function defaultForSchema(schema) {
  if (!schema || typeof schema !== 'object') return undefined;
  if (Object.hasOwn(schema, 'default')) return schema.default;
  if (Object.hasOwn(schema, 'const')) return schema.const;
  if (Array.isArray(schema.enum) && schema.enum.length > 0) return schema.enum[0];
  if (Array.isArray(schema.type)) {
    for (const type of schema.type) {
      const value = defaultForSchema({ ...schema, type });
      if (value !== undefined) return value;
    }
    return undefined;
  }

  switch (schema.type) {
    case 'object':
      return {};
    case 'array':
      return [];
    case 'string':
      return '';
    case 'number':
    case 'integer':
      return 0;
    case 'boolean':
      return false;
    default:
      return undefined;
  }
}

function coerceValue(value, expectedType) {
  const types = Array.isArray(expectedType) ? expectedType : [expectedType];
  for (const type of types) {
    if (type === 'string' && typeof value !== 'object') return String(value);
    if (type === 'number' && value !== '' && Number.isFinite(Number(value))) {
      return Number(value);
    }
    if (type === 'integer' && value !== '' && Number.isInteger(Number(value))) {
      return Number(value);
    }
    if (type === 'boolean' && (value === 'true' || value === 'false')) {
      return value === 'true';
    }
    if ((type === 'object' || type === 'array') && typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if ((type === 'array' && Array.isArray(parsed)) ||
          (type === 'object' && parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed))) {
          return parsed;
        }
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

export function suggestPayloadCorrection(payload, schema, errors = []) {
  if (!schema || typeof schema !== 'object' || !Array.isArray(errors)) return null;

  let suggestion;
  try {
    suggestion = structuredClone(payload);
  } catch {
    return null;
  }

  let changed = false;
  for (const error of errors) {
    const path = decodePointer(error.instancePath ?? '');
    const { parent, key } = getParentAtPath(suggestion, path);
    const currentSchema = schemaAtPath(schema, path);

    if (
      error.keyword === 'required' &&
      getAtPath(suggestion, path) &&
      typeof getAtPath(suggestion, path) === 'object' &&
      !Array.isArray(getAtPath(suggestion, path)) &&
      typeof error.params?.missingProperty === 'string'
    ) {
      const requiredObject = getAtPath(suggestion, path);
      const missingProperty = error.params.missingProperty;
      if (!Object.hasOwn(requiredObject, missingProperty)) {
        const value = defaultForSchema(currentSchema?.properties?.[missingProperty]);
        if (value !== undefined) {
          setOwnProperty(requiredObject, missingProperty, value);
          changed = true;
        }
      }
      continue;
    }

    if (
      error.keyword === 'additionalProperties' &&
      currentSchema?.additionalProperties === false &&
      getAtPath(suggestion, path) &&
      typeof getAtPath(suggestion, path) === 'object' &&
      typeof error.params?.additionalProperty === 'string'
    ) {
      const additionalPropertiesObject = getAtPath(suggestion, path);
      const additionalProperty = error.params.additionalProperty;
      if (Object.hasOwn(additionalPropertiesObject, additionalProperty)) {
        delete additionalPropertiesObject[additionalProperty];
        changed = true;
      }
      continue;
    }

    if (error.keyword === 'type') {
      const current = getAtPath(suggestion, path);
      const replacement = coerceValue(current, error.params?.type);
      if (replacement !== undefined && parent && key !== null && parent[key] !== replacement) {
        setOwnProperty(parent, key, replacement);
        changed = true;
      } else if (path.length === 0 && replacement !== undefined) {
        suggestion = replacement;
        changed = true;
      } else if (replacement === undefined && parent && key !== null) {
        const fallback = defaultForSchema(currentSchema);
        if (fallback !== undefined) {
          setOwnProperty(parent, key, fallback);
          changed = true;
        }
      }
      continue;
    }

    if (error.keyword === 'enum' || error.keyword === 'const') {
      const replacement = defaultForSchema(currentSchema);
      if (replacement !== undefined && parent && key !== null) {
        setOwnProperty(parent, key, replacement);
        changed = true;
      } else if (replacement !== undefined && path.length === 0) {
        suggestion = replacement;
        changed = true;
      }
    }
  }

  return changed ? suggestion : null;
}
