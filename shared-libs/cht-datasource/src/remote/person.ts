import { Nullable } from '../libs/core';
import { ContactTypeQualifier, UuidQualifier } from '../qualifier';
import * as Person from '../person';
import { getResource, getResources, RemoteDataContext } from './libs/data-context';

/** @internal */
export namespace v1 {
  const getPerson = (remoteContext: RemoteDataContext) => getResource(remoteContext, 'api/v1/person');

  const getPeople = (remoteContext: RemoteDataContext) => getResources(remoteContext, 'api/v1/person');

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

  /** @internal */
  export const getPage = (remoteContext: RemoteDataContext) => (
    personType: ContactTypeQualifier,
    limit: number,
    skip: number
  ): Promise<null> => getPeople(remoteContext)(
    {'limit': limit.toString(), 'skip': skip.toString(), 'contactType': personType.contactType}
  );
}
