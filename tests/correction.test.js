import test from 'node:test';
import assert from 'node:assert/strict';
import { suggestPayloadCorrection } from '../src/services/correction.js';

test('suggests schema defaults for missing required fields', () => {
  const suggestion = suggestPayloadCorrection(
    { name: 'Widget' },
    {
      type: 'object',
      required: ['name', 'quantity'],
      properties: {
        name: { type: 'string' },
        quantity: { type: 'integer', default: 1 },
      },
    },
    [{
      keyword: 'required',
      instancePath: '',
      params: { missingProperty: 'quantity' },
    }],
  );

  assert.deepEqual(suggestion, { name: 'Widget', quantity: 1 });
});

test('suggests safe primitive type coercion', () => {
  const suggestion = suggestPayloadCorrection(
    { count: '12' },
    { type: 'object', properties: { count: { type: 'integer' } } },
    [{
      keyword: 'type',
      instancePath: '/count',
      params: { type: 'integer' },
    }],
  );

  assert.deepEqual(suggestion, { count: 12 });
});

test('handles nested schema paths with escaped JSON pointer segments', () => {
  const suggestion = suggestPayloadCorrection(
    { 'a/b': { count: '12' } },
    {
      type: 'object',
      properties: {
        'a/b': {
          type: 'object',
          properties: { count: { type: 'integer' } },
        },
      },
    },
    [{
      keyword: 'type',
      instancePath: '/a~1b/count',
      params: { type: 'integer' },
    }],
  );

  assert.deepEqual(suggestion, { 'a/b': { count: 12 } });
});

test('removes disallowed additional properties', () => {
  const suggestion = suggestPayloadCorrection(
    { id: 7, unexpected: true },
    { type: 'object', additionalProperties: false, properties: { id: { type: 'integer' } } },
    [{
      keyword: 'additionalProperties',
      instancePath: '',
      params: { additionalProperty: 'unexpected' },
    }],
  );

  assert.deepEqual(suggestion, { id: 7 });
});

test('returns no suggestion when it cannot safely fix any errors', () => {
  const suggestion = suggestPayloadCorrection(
    { message: 'text' },
    { type: 'object', properties: { message: { type: 'string', minLength: 20 } } },
    [{
      keyword: 'minLength',
      instancePath: '/message',
      params: { limit: 20 },
    }],
  );

  assert.equal(suggestion, null);
});
