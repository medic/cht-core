const path = require('node:path');
const fs = require('node:fs');
const swaggerJsdoc = require('swagger-jsdoc');
const tsj = require('ts-json-schema-generator');
const { Spectral, Document } = require('@stoplight/spectral-core');
const Parsers = require('@stoplight/spectral-parsers');
const { oas } = require('@stoplight/spectral-rulesets');
const { version } = require('../../package.json');

const DATASOURCE_DIR = path.resolve(__dirname, '../../shared-libs/cht-datasource/src');
const TSCONFIG = path.resolve(__dirname, '../../shared-libs/cht-datasource/tsconfig.build.json');

const TYPE_SOURCES = [
  'contact.ts',
  'person.ts',
  'place.ts',
  'report.ts',
  'target.ts',
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
    components: {
      schemas: {
        PageCursor: {
          type: ['string', 'null'],
          description: 'Token for retrieving the next page. A `null` value indicates there are no more pages.',
        },
        OkResponse: {
          type: 'object',
          properties: {
            ok: { const: true },
          },
        },
      },
      parameters: {
        cursor: {
          in: 'query',
          name: 'cursor',
          schema: { type: 'string' },
          description:
            'Token identifying which page to retrieve. Omit for the first page. ' +
            'Subsequent pages can be retrieved by providing the cursor returned with the previous page.',
        },
        limitEntity: {
          in: 'query',
          name: 'limit',
          schema: { type: 'number', default: 100, minimum: 1 },
          description: 'The maximum number of entities to return.',
        },
        limitId: {
          in: 'query',
          name: 'limit',
          schema: { type: 'number', default: 10000, minimum: 1 },
          description: 'The maximum number of identifiers to return.',
        },
        withLineage: {
          in: 'query',
          name: 'with_lineage',
          schema: { 'enum': ['true', 'false'], default: 'false' },
          description: 'Include the full parent lineage.'
        }
      },
      responses: {
        NotFound: { description: 'Entity not found' },
        BadRequest: { description: 'Invalid input (missing required fields, invalid types, etc.)' },
        Unauthorized: { description: 'Not authenticated' },
        Forbidden: { description: 'Insufficient permissions' }
      }
    },
  },
  apis: [
    path.resolve(__dirname, '../../api/src/routing.js'),
    path.resolve(__dirname, '../../api/src/controllers/**/*.js'),
  ],
};

const SPECTRAL_OPTIONS = { extends: [[oas, 'all']], rules: {} };

const transformObject = (obj) => {
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

const transformSchema = (schema) => {
  if (schema === null || typeof schema !== 'object') {
    return schema;
  }
  if (Array.isArray(schema)) {
    return schema.map(transformSchema);
  }
  return transformObject(schema);
};

const generateTsSchemas = () => {
  const schemas = {};
  TYPE_SOURCES
    .map(path => ({ ...TSJ_OPTIONS, path }))
    .map(opts => tsj.createGenerator(opts))
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

  const errors = results.filter(r => r.severity <= 1);
  if (errors.length > 0) {
    throw new Error(`OpenAPI spec has ${errors.length} validation error(s)`);
  }
};

const main = async () => {
  const swaggerSpec = swaggerJsdoc(SWAGGER_OPTIONS);
  const tsSchemas = generateTsSchemas();
  Object.assign(swaggerSpec.components.schemas, tsSchemas);
  swaggerSpec.tags.sort((a, b) => a.name.localeCompare(b.name));
  await lintSpec(swaggerSpec);
  const outputPath = path.resolve(__dirname, '../../shared-libs/cht-datasource/docs/openapi.json');
  fs.writeFileSync(outputPath, JSON.stringify(swaggerSpec));
};

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
