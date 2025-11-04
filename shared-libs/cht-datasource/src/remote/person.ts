import { Nullable, Page } from '../libs/core';
import { ContactTypeQualifier, UuidQualifier, ContactQualifier } from '../qualifier';
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
  export const create = (remoteContext: RemoteDataContext) => (
    qualifier: ContactQualifier
  ): Promise<Person.v1.Person> => {
    const createPerson = postResource(remoteContext, 'api/v1/person');
    return createPerson<Person.v1.Person>(qualifier as Record<string, unknown>);
  };

  /** @internal */
  export const update = (remoteContext: RemoteDataContext) => (
    qualifier: ContactQualifier
  ): Promise<Person.v1.Person> => {
    // No validation here - API server will call local implementation which validates
    const updatePerson = putResource(remoteContext, 'api/v1/person');
    const id = qualifier._id!;
    return updatePerson<Person.v1.Person>(id, qualifier as Record<string, unknown>);
  };
}
