import { ContactTypeQualifier, UuidQualifier } from './qualifier';
import { adapt, assertDataContext, DataContext } from './libs/data-context';
import * as Contact from './contact';
import * as Remote from './remote';
import * as Local from './local';
import * as Place from './place';
import { LocalDataContext } from './local/libs/data-context';
import { RemoteDataContext } from './remote/libs/data-context';
import {
  DateTimeString,
  getPagedGenerator,
  isIdentifiable,
  isRecord,
  NormalizedParent,
  Nullable,
  Page
} from './libs/core';
import { DEFAULT_DOCS_PAGE_LIMIT } from './libs/constants';
import { assertCursor, assertLimit, assertTypeQualifier, assertUuidQualifier } from './libs/parameter-validators';
import * as Input from './input';
import { InvalidArgumentError } from './libs/error';

/** */
export namespace v1 {
  /**
   * Immutable data about a person contact.
   */
  export interface Person extends Contact.v1.Contact {
    readonly date_of_birth?: DateTimeString;
    readonly phone?: string;
    readonly patient_id?: string;
    readonly sex?: string;
  }

  /**
   * Immutable data about a person contact, including the full records of the parent place lineage.
   */
  export interface PersonWithLineage extends Person {
    readonly parent?: Place.v1.PlaceWithLineage | NormalizedParent;
  }

  const getPerson =
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
   * Returns a person for the given qualifier.
   * @param context the current data context
   * @returns the person or `null` if no person is found for the qualifier
   * @throws Error if the provided context or qualifier is invalid
   */
  export const get = getPerson(Local.Person.v1.get, Remote.Person.v1.get);

  /**
   * Returns a person for the given qualifier with the person's parent lineage.
   * @param context the current data context
   * @returns the person or `null` if no person is found for the qualifier
   * @throws Error if the provided context or qualifier is invalid
   */
  export const getWithLineage = getPerson(Local.Person.v1.getWithLineage, Remote.Person.v1.getWithLineage);

  /**
   * Returns a function for retrieving a paged array of people from the given data context.
   * @param context the current data context
   * @returns a function for retrieving a paged array of people
   * @throws Error if a data context is not provided
   * @see {@link getAll} which provides the same data, but without having to manually account for paging
   */
  export const getPage = (context: DataContext): typeof curriedFn => {
    assertDataContext(context);
    const fn = adapt(context, Local.Person.v1.getPage, Remote.Person.v1.getPage);

    /**
     * Returns an array of people for the provided page specifications.
     * @param personType the type of people to return
     * @param cursor the token identifying which page to retrieve. A `null` value indicates the first page should be
     * returned. Subsequent pages can be retrieved by providing the cursor returned with the previous page.
     * @param limit the maximum number of people to return. Default is 100.
     * @returns a page of people for the provided specification
     * @throws InvalidArgumentError if no type is provided or if the type is not for a person
     * @throws InvalidArgumentError if the provided `limit` value is `<=0`
     * @throws InvalidArgumentError if the provided cursor is not a valid page token or `null`
     */
    const curriedFn = async (
      personType: ContactTypeQualifier,
      cursor: Nullable<string> = null,
      limit: number | `${number}` = DEFAULT_DOCS_PAGE_LIMIT
    ): Promise<Page<Person>> => {
      assertTypeQualifier(personType);
      assertCursor(cursor);
      assertLimit(limit);

      return fn(personType, cursor, Number(limit));
    };
    return curriedFn;
  };

  /**
   * Returns a function for getting a generator that fetches people from the given data context.
   * @param context the current data context
   * @returns a function for getting a generator that fetches people
   * @throws Error if a data context is not provided
   */
  export const getAll = (context: DataContext): typeof curriedGen => {
    assertDataContext(context);
    const getPage = context.bind(v1.getPage);

    /**
     * Returns a generator for fetching all people with the given type
     * @param personType the type of people to return
     * @returns a generator for fetching all people with the given type
     * @throws InvalidArgumentError if no type is provided or if the type is not for a person
     */
    const curriedGen = (personType: ContactTypeQualifier): AsyncGenerator<Person, null> => {
      assertTypeQualifier(personType);
      return getPagedGenerator(getPage, personType);
    };
    return curriedGen;
  };

  /**
   * Returns a function for creating a person from the given data context.
   * @param context the current data context
   * @returns a function for creating a person.
   * @throws Error if a data context is not provided
   */
  export const create = (context: DataContext): typeof curriedFn => {
    assertDataContext(context);
    const fn = adapt(context, Local.Person.v1.create, Remote.Person.v1.create);

    /**
     * Creates a new person record.
     * @param input input fields for creating a person
     * @returns the created person record
     * @throws InvalidArgumentError if `type` is not provided or is not a supported person contact type
     * @throws InvalidArgumentError if `name` is not provided
     * @throws InvalidArgumentError if `parent` is not provided or is not the identifier of a valid contact. The parent
     * contact's type must be one of the supported parent contact types for the new person.
     * @throws InvalidArgumentError if the provided `reported_date` is not in a valid format. Valid formats are
     * 'YYYY-MM-DDTHH:mm:ssZ', 'YYYY-MM-DDTHH:mm:ss.SSSZ', or <unix epoch>.
     */
    const curriedFn = async (input: Input.v1.PersonInput): Promise<Person> => {
      if (!isRecord(input)) {
        throw new InvalidArgumentError('Person data not provided.');
      }
      return fn(input);
    };
    return curriedFn;
  };

  /**
   * Returns a function for updating a person from the given data context.
   * @param context the current data context
   * @returns a function for updating a person
   * @throws Error if a data context is not provided
   */
  export const update = (context: DataContext): typeof curriedFn => {
    assertDataContext(context);
    const fn = adapt(context, Local.Person.v1.update, Remote.Person.v1.update);

    /**
     * Updates an existing person to have the provided data.
     * @param updated the updated person data. The complete data for the person must be provided. Existing fields not
     * included in the updated data will be removed from the person. If the provided parent lineage is hydrated (e.g.
     * for a {@link PersonWithLineage}), the lineage will be properly dehydrated before being stored.
     * @returns the updated person with the new `_rev` value
     * @throws InvalidArgumentError if `_id` is not provided
     * @throws ResourceNotFoundError if `_id does not identify an existing person contact
     * @throws InvalidArgumentError if `_rev` is not provided or does not match the person's current `_rev` value
     * @throws InvalidArgumentError if `name` is not provided
     * @throws InvalidArgumentError if any of the following read-only properties are changed: `reported_date`, `parent`,
     * `type`, `contact_type`
     */
    const curriedFn = async <T extends Input.v1.UpdatePersonInput>(updated: T): Promise<T> => {
      if (!isIdentifiable(updated)) {
        throw new InvalidArgumentError('Updated person data not provided.');
      }
      return fn(updated);
    };
    return curriedFn;
  };
}
