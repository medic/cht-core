const path = require('node:path');
const fs = require('node:fs');
const swaggerJsdoc = require('swagger-jsdoc');
const tsj = require('ts-json-schema-generator');
const { Spectral, Document } = require('@stoplight/spectral-core');
const Parsers = require('@stoplight/spectral-parsers');
const { oas } = require('@stoplight/spectral-rulesets');
const { version } = require('../package.json');

const DATASOURCE_DIR = path.resolve(__dirname, '../shared-libs/cht-datasource/src');
const TSCONFIG = path.resolve(__dirname, '../shared-libs/cht-datasource/tsconfig.build.json');

const TYPE_SOURCES = [
  'person.ts',
  'input.ts',
].map(file => path.join(DATASOURCE_DIR, file));

const TSJ_OPTIONS = {
  tsconfig: TSCONFIG,
  type: '*',
  skipTypeCheck: true,
  discriminatorType: 'open-api',
  functions: 'hide',
};

const SWAGGER_OPTIONS = {
  failOnErrors: true,
  definition: {
    openapi: '3.1.0',
    info: {
      title: 'CHT API',
      version: version,
      description: 'API for interacting with the Community Health Toolkit',
      contact: {
        name: 'Medic',
        email: 'hello@medic.org',
        url: 'https://forum.communityhealthtoolkit.org/'
      },
      license: {
        name: 'AGPL-3.0',
        url: 'https://www.gnu.org/licenses/agpl-3.0.html'
      }
    },
    servers: [{ url: '/' }],
    components: { schemas: {} },
  },
  apis: [path.resolve(__dirname, '../api/src/controllers/**/*.js')],
};

const SPECTRAL_OPTIONS = { extends: [[oas, 'all']], rules: {} };

const transformSchema = (obj) => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(transformSchema);
  }

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === '$ref') {
      result[key] = value.replace('#/definitions/', '#/components/schemas/');
      continue;
    }
    result[key] = transformSchema(value);
  }

  // Simplify complex additionalProperties to just `true` since these are open-ended document types
  if (result.additionalProperties) {
    result.additionalProperties = true;
  }

  return result;
};

const generateTsSchemas = () => {
  const schemas = {};
  TYPE_SOURCES
    .map(path => ({ ...TSJ_OPTIONS, path }))
    .map(tsj.createGenerator)
    .map(generator => generator.createSchema())
    .map(({ definitions }) => ({ ...definitions, '*': undefined }))
    .forEach((definitions) => Object.assign(schemas, definitions));
  return transformSchema(schemas);
};

const DIAGNOSTIC_SEVERITY = ['error', 'warn', 'info', 'hint'];

const lintSpec = async (spec) => {
  const spectral = new Spectral();
  spectral.setRuleset(SPECTRAL_OPTIONS);
  const doc = new Document(JSON.stringify(spec), Parsers.Json, '/openapi.json');
  const results = await spectral.run(doc);

  results.forEach(({
    severity, code, message, path
  }) => console.log(`  [${DIAGNOSTIC_SEVERITY[severity]}] ${code}: ${message} (at ${path.join('.')})`));

  const errors = results.filter(r => r.severity === 0);
  if (errors.length > 0) {
    throw new Error(`OpenAPI spec has ${errors.length} validation error(s)`);
  }
  // TODO Consider failing for warnings
};

const main = async () => {
  const swaggerSpec = swaggerJsdoc(SWAGGER_OPTIONS);
  const tsSchemas = generateTsSchemas();
  Object.assign(swaggerSpec.components.schemas, tsSchemas);
  await lintSpec(swaggerSpec);
  // TODO Currently publishing with cht-datasource docs site.
  const outputPath = path.resolve(__dirname, '../shared-libs/cht-datasource/docs/openapi.json');
  fs.writeFileSync(outputPath, JSON.stringify(swaggerSpec, null, 2) + '\n');
};

main()
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
