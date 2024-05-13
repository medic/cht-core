import { fetchIdentifiedResource } from './libs/remote-environment';
import { Nullable } from '../libs/core';
import { UuidQualifier } from '../qualifier';
import * as Person from '../person';

export namespace V1 {
  export const get = async (identifier: UuidQualifier): Promise<Nullable<Person.V1.Person>> => fetchIdentifiedResource(
    'api/v1/person',
    identifier.uuid
  );
}
