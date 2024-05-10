/**
 * CHT Script API - Index
 * Builds and exports a versioned API from feature modules.
 * Whenever possible keep this file clean by defining new features in modules.
 */
import { hasAnyPermission, hasPermissions } from './auth';
import { v1 as personV1 } from './person';
import { v1 as docV1 } from './libs/doc';
import getLocalEnvironment, { LocalEnvironment } from './libs/local-environment';
// import { AnotherTestType } from './cht-datasource';

const adapt = <T>(
  localEnv: Nullable<LocalEnvironment>,
  remoteAdapter: T,
  localAdapter: (localEnv: LocalEnvironment) => T,
) => {
  if (localEnv) {
    return localAdapter(localEnv);
  }
  return remoteAdapter;
};

// declare namespace 'V1' {
//   export const byUuid = docV1.byUuid;
//   export import Person = PersonV1.Person;
//   export import UuidIdentifier = DocV1.UuidIdentifier;
//   export import byUuid = DocV1.byUuid;
// }

export const getDataSource = async (sourceDatabases?: SourceDatabases) => {
  const localEnv = await getLocalEnvironment(sourceDatabases);

  return {
    v1: {
      hasPermissions,
      hasAnyPermission,
      byUuid: docV1.byUuid,
      person: adapt(localEnv, personV1.remote, personV1.local),
    }
  };
};

module.exports = { getDataSource };
// export default { getDataSource };
