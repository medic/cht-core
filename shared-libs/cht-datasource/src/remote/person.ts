import { Nullable } from '../libs/core';
import { UuidQualifier } from '../qualifier';
import * as Person from '../person';
import { get as GET, RemoteDataContext } from './libs/data-context';

export namespace V1 {
  /** @internal */
  export const get = (remoteContext: RemoteDataContext) => {
    const getPerson = GET(remoteContext, 'api/v1/person/');
    return async (identifier: UuidQualifier): Promise<Nullable<Person.V1.Person>> => getPerson(identifier.uuid);
  };
}
