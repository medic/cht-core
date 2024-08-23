import { Nullable, Page } from '../libs/core';
import {ContactTypeQualifier, UuidQualifier} from '../qualifier';
import * as Place from '../place';
import { getResource, getResources, RemoteDataContext } from './libs/data-context';

/** @internal */
export namespace v1 {
  const getPlace = (remoteContext: RemoteDataContext) => getResource(remoteContext, 'api/v1/place');

  const getPlaces = (remoteContext: RemoteDataContext) => getResources(remoteContext, 'api/v1/places');

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

  /** @internal */
  export const getPage = (remoteContext: RemoteDataContext) => (
    placeType: ContactTypeQualifier,
    cursor: Nullable<string>,
    limit: number,
  ): Promise<Page<Place.v1.Place>> => {
    const queryParams = {
      'limit': limit.toString(),
      'placeType': placeType.contactType,
      ...(cursor ? { cursor } : {})
    };
    return getPlaces(remoteContext)(queryParams);
  };
}
