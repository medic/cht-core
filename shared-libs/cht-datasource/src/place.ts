import { Contact, NormalizedParent } from './libs/contact';
import * as Person from './person';
import { LocalDataContext } from './local/libs/data-context';
import { isUuidQualifier, UuidQualifier } from './qualifier';
import { RemoteDataContext } from './remote/libs/data-context';
import { adapt, assertDataContext, DataContext } from './libs/data-context';
import * as Local from './local';
import * as Remote from './remote';

/** */
export namespace v1 {

  /**
   * Immutable data about a place contact.
   */
  export interface Place extends Contact {
    readonly contact?: NormalizedParent,
    readonly place_id?: string,
  }

  /**
   * Immutable data about a place contact, including the full records of the parent place lineage and the primary
   * contact for the place.
   */
  export interface PlaceWithLineage extends Place {
    readonly contact?: Person.v1.PersonWithLineage | NormalizedParent,
    readonly parent?: PlaceWithLineage | NormalizedParent,
  }

  const assertPlaceQualifier: (qualifier: unknown) => asserts qualifier is UuidQualifier = (qualifier: unknown) => {
    if (!isUuidQualifier(qualifier)) {
      throw new Error(`Invalid identifier [${JSON.stringify(qualifier)}].`);
    }
  };

  const getPlace = <T>(
    localFn: (c: LocalDataContext) => (qualifier: UuidQualifier) => Promise<T>,
    remoteFn: (c: RemoteDataContext) => (qualifier: UuidQualifier) => Promise<T>
  ) => (context: DataContext) => {
      assertDataContext(context);
      const fn = adapt(context, localFn, remoteFn);
      return async (qualifier: UuidQualifier): Promise<T> => {
        assertPlaceQualifier(qualifier);
        return fn(qualifier);
      };
    };

  /**
   * Returns a place for the given qualifier.
   * @param context the current data context
   * @returns the place or `null` if no place is found for the qualifier
   * @throws Error if the provided context or qualifier is invalid
   */
  export const get = getPlace(Local.Place.v1.get, Remote.Place.v1.get);

  /**
   * Returns a place for the given qualifier with the place's parent lineage.
   * @param context the current data context
   * @returns the place or `null` if no place is found for the qualifier
   * @throws Error if the provided context or qualifier is invalid
   */
  export const getWithLineage = getPlace(Local.Place.v1.getWithLineage, Remote.Place.v1.getWithLineage);
}
