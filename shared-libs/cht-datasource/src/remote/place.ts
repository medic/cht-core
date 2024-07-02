import { Nullable } from '../libs/core';
import { UuidQualifier } from '../qualifier';
import * as Place from '../place';
import { getResource, RemoteDataContext } from './libs/data-context';

/** @internal */
export namespace v1 {
  const getPlace = (remoteContext: RemoteDataContext) => getResource(remoteContext, 'api/v1/place');

  /** @internal */
  export const get = (remoteContext: RemoteDataContext) => (
    identifier: UuidQualifier
  ): Promise<Nullable<Place.v1.Place>> => getPlace(remoteContext)(identifier.uuid);

  /** @internal */
  export const getWithLineage = (remoteContext: RemoteDataContext) => (
    identifier: UuidQualifier
  ): Promise<Nullable<Place.v1.PlaceWithLineage>> => getPlace(remoteContext)(
    identifier.uuid,
    { with_lineage: 'true' }
  );
}
