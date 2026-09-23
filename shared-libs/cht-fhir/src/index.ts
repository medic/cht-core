/**
 * `@medic/cht-fhir` — the pure half of CHT's FHIR facade.
 *
 * Config plus a CHT document in, a FHIR resource or a query *plan* out. No
 * I/O, no clock, no database. `api/src/services/fhir.js` executes the plans
 * and `api/src/controllers/fhir.js` speaks HTTP; everything interesting about
 * the mapping is here and unit-testable without CouchDB.
 */
export * from './catalog';
export * from './config';
export * from './conformance';
export * from './mapper';
export * from './query';
