/**
 * CHT Script API - Index
 * Builds and exports a versioned API from feature modules.
 * Whenever possible keep this file clean by defining new features in modules.
 */
import { hasAnyPermission, hasPermissions } from './auth';
import { V1 as PersonV1 } from './person';
import { V1 as DocV1 } from './libs/doc';
import { Nullable as _Nullable } from './libs/core';
import getLocalEnvironment, { LocalEnvironment, SourceDatabases as _SourceDatabases } from './libs/local-environment';

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

export type SourceDatabases = _SourceDatabases;
export type Nullable<T> = _Nullable<T>;

export namespace V1 {
  export import Person = PersonV1.Person;
  export import UuidIdentifier = DocV1.UuidIdentifier;
  export import byUuid = DocV1.byUuid;
}

const getDataSource = async (sourceDatabases?: SourceDatabases) => {
  const localEnv = await getLocalEnvironment(sourceDatabases);

  return {
    v1: {
      hasPermissions,
      hasAnyPermission,
      person: adapt(localEnv, PersonV1.remote, PersonV1.local),
    }
  };
};

module.exports = getDataSource;
export default getDataSource;
