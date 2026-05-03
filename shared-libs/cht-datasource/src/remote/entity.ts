import { Nullable } from '../libs/core';
import { UuidQualifier } from '../qualifier';
import { getResource, RemoteDataContext } from './libs/data-context';
import { Doc } from '../libs/doc';

/** @internal */
export namespace v1 {
  const getEntity = (remoteContext: RemoteDataContext) => getResource(remoteContext, 'api/v1/entity');

  /** @internal */
  export const get = (remoteContext: RemoteDataContext) => (
    identifier: UuidQualifier
  ): Promise<Nullable<Doc>> => getEntity(remoteContext)(identifier.uuid);
}
