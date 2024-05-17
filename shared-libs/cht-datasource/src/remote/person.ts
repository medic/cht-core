import { fetchIdentifiedResource } from './libs/remote-environment';
import { Nullable } from '../libs/core';
import { UuidQualifier } from '../qualifier';
import * as Person from '../person';

/** @internal */
export namespace V1 {
  /** @internal */
  export const get = async (identifier: UuidQualifier): Promise<Nullable<Person.V1.Person>> => fetchIdentifiedResource(
    'api/v1/person',
    identifier.uuid
  );
}
