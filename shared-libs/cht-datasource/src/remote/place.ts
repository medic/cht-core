import { Nullable, Page } from '../libs/core';
import { ContactTypeQualifier, UuidQualifier } from '../qualifier';
import * as Place from '../place';
import { getResource, getResources, postResource, putResource, RemoteDataContext } from './libs/data-context';
import * as Input from '../input';

/** @internal */
export namespace v1 {
  const getPlace = (remoteContext: RemoteDataContext) => getResource(remoteContext, 'api/v1/place');

  const getPlaces = (remoteContext: RemoteDataContext) => getResources(remoteContext, 'api/v1/place');

  const createPlace = (remoteContext: RemoteDataContext) => postResource(remoteContext, 'api/v1/place');

  const updatePlace = (remoteContext: RemoteDataContext) => putResource(remoteContext, 'api/v1/place');

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
  export const create =
    (remoteContext: RemoteDataContext) => (
      input: Input.v1.PlaceInput
    ): Promise<Place.v1.Place> => createPlace(remoteContext)(input);

  /** @internal */
  export const update =
    (remoteContext: RemoteDataContext) => (
      input: Record<string, unknown>
    ): Promise<Place.v1.Place> => updatePlace(remoteContext)(input);
}
