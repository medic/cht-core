import * as Contact from './contact';
import * as Person from './person';
import { LocalDataContext } from './local/libs/data-context';
import { ContactTypeQualifier, UuidQualifier } from './qualifier';
import { RemoteDataContext } from './remote/libs/data-context';
import { adapt, assertDataContext, DataContext } from './libs/data-context';
import * as Local from './local';
import * as Remote from './remote';
import { getPagedGenerator, NormalizedParent, Nullable, Page } from './libs/core';
import { DEFAULT_DOCS_PAGE_LIMIT } from './libs/constants';
import { assertCursor, assertLimit, assertTypeQualifier, assertUuidQualifier } from './libs/parameter-validators';

/** */
export namespace v1 {
  /**
   * Immutable data about a place contact.
   */
  export interface Place extends Contact.v1.Contact {
    readonly contact?: NormalizedParent;
    readonly place_id?: string;
  }

  /**
   * Immutable data about a place contact, including the full records of the parent place lineage and the primary
   * contact for the place.
   */
  export interface PlaceWithLineage extends Place {
    readonly contact?: Person.v1.PersonWithLineage | NormalizedParent;
    readonly parent?: PlaceWithLineage | NormalizedParent;
  }

  const getPlace =
    <T>(
      localFn: (c: LocalDataContext) => (qualifier: UuidQualifier) => Promise<T>,
      remoteFn: (c: RemoteDataContext) => (qualifier: UuidQualifier) => Promise<T>
    ) => (context: DataContext) => {
      assertDataContext(context);
      const fn = adapt(context, localFn, remoteFn);
      return async (qualifier: UuidQualifier): Promise<T> => {
        assertUuidQualifier(qualifier);
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

  /**
   * Returns a function for retrieving a paged array of places from the given data context.
   * @param context the current data context
   * @returns a function for retrieving a paged array of places
   * @throws Error if a data context is not provided
   * @see {@link getAll} which provides the same data, but without having to manually account for paging
   */
  export const getPage = (context: DataContext): typeof curriedFn => {
    assertDataContext(context);
    const fn = adapt(context, Local.Place.v1.getPage, Remote.Place.v1.getPage);

    /**
     * Returns an array of places for the provided page specifications.
     * @param placeType the type of places to return
     * @param cursor the token identifying which page to retrieve. A `null` value indicates the first page should be
     * returned. Subsequent pages can be retrieved by providing the cursor returned with the previous page.
     * @param limit the maximum number of places to return. Default is 100.
     * @returns a page of places for the provided specification
     * @throws InvalidArgumentError if no type is provided or if the type is not for a place
     * @throws InvalidArgumentError if the provided `limit` value is `<=0`
     * @throws InvalidArgumentError if the provided cursor is not a valid page token or `null`
     */
    const curriedFn = async (
      placeType: ContactTypeQualifier,
      cursor: Nullable<string> = null,
      limit: number | `${number}` = DEFAULT_DOCS_PAGE_LIMIT
    ): Promise<Page<Place>> => {
      assertTypeQualifier(placeType);
      assertCursor(cursor);
      assertLimit(limit);

      return fn(placeType, cursor, Number(limit));
    };
    return curriedFn;
  };

  /**
   * Returns a function for getting a generator that fetches places from the given data context.
   * @param context the current data context
   * @returns a function for getting a generator that fetches places
   * @throws Error if a data context is not provided
   */
  export const getAll = (context: DataContext): typeof curriedGen => {
    assertDataContext(context);
    const getPage = context.bind(v1.getPage);

    /**
     * Returns a generator for fetching all places with the given type
     * @param placeType the type of places to return
     * @returns a generator for fetching all places with the given type
     * @throws InvaidArgumentError if no type is provided or if the type is not for a place
     */
    const curriedGen = (placeType: ContactTypeQualifier) => {
      assertTypeQualifier(placeType);
      return getPagedGenerator(getPage, placeType);
    };
    return curriedGen;
  };
}
