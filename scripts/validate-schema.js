#!/usr/bin/env node
/**
 * Validates content/projects.json against content/schema/projects.schema.json.
 * Fails on: invalid enum, wrong types, duplicate id, missing required fields.
 * Usage: node scripts/validate-schema.js (from repo root)
 */

const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const root = path.resolve(__dirname, '..');
const dataPath = path.join(root, 'content', 'projects.json');
const schemaPath = path.join(root, 'content', 'schema', 'projects.schema.json');

function main() {
  let data, schema;
  try {
    data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  } catch (e) {
    console.error('Failed to read or parse content/projects.json:', e.message);
    process.exit(1);
  }
  try {
    schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  } catch (e) {
    console.error('Failed to read or parse content/schema/projects.schema.json:', e.message);
    process.exit(1);
  }

  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const valid = validate(data);
  if (!valid) {
    console.error('Schema validation failed:');
    validate.errors.forEach((err) => console.error('  ', err.instancePath || '/', err.message));
    process.exit(1);
  }

  const ids = new Set();
  for (let i = 0; i < data.length; i++) {
    const id = data[i].id;
    if (ids.has(id)) {
      console.error(`Duplicate id: "${id}" at index ${i}`);
      process.exit(1);
    }
    ids.add(id);
  }

  console.log('OK: content/projects.json is valid (' + data.length + ' projects).');
}

main();
