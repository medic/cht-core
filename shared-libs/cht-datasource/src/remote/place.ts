import { Nullable, Page } from '../libs/core';
import { ContactTypeQualifier, UuidQualifier, ContactQualifier } from '../qualifier';
import * as Place from '../place';
import { getResource, getResources, postResource, putResource, RemoteDataContext } from './libs/data-context';

/** @internal */
export namespace v1 {
  const getPlace = (remoteContext: RemoteDataContext) => getResource(remoteContext, 'api/v1/place');

  const getPlaces = (remoteContext: RemoteDataContext) => getResources(remoteContext, 'api/v1/place');

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
      'type': placeType.contactType,
      ...(cursor ? { cursor } : {})
    };
    return getPlaces(remoteContext)(queryParams);
  };

  /** @internal */
  export const create = (remoteContext: RemoteDataContext) => (
    qualifier: ContactQualifier
  ): Promise<Place.v1.Place> => {
    const createPlace = postResource(remoteContext, 'api/v1/place');
    return createPlace<Place.v1.Place>(qualifier as Record<string, unknown>);
  };

  /** @internal */
  export const update = (remoteContext: RemoteDataContext) => (
    qualifier: ContactQualifier
  ): Promise<Place.v1.Place> => {
    // No validation here - API server will call local implementation which validates
    const updatePlace = putResource(remoteContext, 'api/v1/place');
    const id = qualifier._id!;
    return updatePlace<Place.v1.Place>(id, qualifier as Record<string, unknown>);
  };
}
