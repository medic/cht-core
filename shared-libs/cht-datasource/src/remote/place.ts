import { Nullable, Page } from '../libs/core';
import { ContactTypeQualifier, UuidQualifier } from '../qualifier';
import * as Place from '../place';
import { getResource, getResources, postResource, RemoteDataContext } from './libs/data-context';
import { PlaceInput } from '../input';

/** @internal */
export namespace v1 {
  const getPlace = (remoteContext: RemoteDataContext) => getResource(remoteContext, 'api/v1/place');

  const getPlaces = (remoteContext: RemoteDataContext) => getResources(remoteContext, 'api/v1/place');

  const createPlacePost = (remoteContext: RemoteDataContext) => postResource(remoteContext, 'api/v1/place');

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
  export const createPlace = 
  (remoteContext: RemoteDataContext) => (
    input:PlaceInput
  ):Promise<Place.v1.Place> => createPlacePost(remoteContext)(input);
}
