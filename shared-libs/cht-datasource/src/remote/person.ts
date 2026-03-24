import { Nullable, Page } from '../libs/core';
import { ContactTypeQualifier, UuidQualifier } from '../qualifier';
import * as Person from '../person';
import { getResource, getResources, postResource, putResource, RemoteDataContext } from './libs/data-context';

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
    cursor: Nullable<string>,
    limit: number,
  ): Promise<Page<Person.v1.Person>> => {
    const queryParams = {
      'limit': limit.toString(),
      'type': personType.contactType,
      ...(cursor ? { cursor } : {})
    };
    return getPeople(remoteContext)(queryParams);
  };

  /** @internal */
  export const create = postResource('api/v1/person');

  /** @internal */
  export const update = putResource('api/v1/person');
}
