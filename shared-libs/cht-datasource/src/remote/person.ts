import { Nullable } from '../libs/core';
import { UuidQualifier } from '../qualifier';
import * as Person from '../person';
import { getResource, RemoteDataContext } from './libs/data-context';

/** @internal */
export namespace v1 {
  const getPerson = (remoteContext: RemoteDataContext) => getResource(remoteContext, 'api/v1/person');

  /** @internal */
  export const get = (remoteContext: RemoteDataContext) => (
    identifier: UuidQualifier
  ): Promise<Nullable<Person.v1.Person>> => getPerson(remoteContext)(identifier.uuid);

  /** @internal */
  export const getWithLineage = (remoteContext: RemoteDataContext) => (
    identifier: UuidQualifier
  ): Promise<Nullable<Person.v1.PersonWithLineage>> => getPerson(remoteContext)(
    identifier.uuid,
    { with_lineage: 'true' }
  );
}
