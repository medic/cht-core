import { ContactTypeQualifier, UuidQualifier } from './qualifier';
import { adapt, assertDataContext, DataContext } from './libs/data-context';
import * as Contact from './contact';
import * as Remote from './remote';
import * as Local from './local';
import * as Place from './place';
import { LocalDataContext } from './local/libs/data-context';
import { RemoteDataContext } from './remote/libs/data-context';
import { getPagedGenerator, isRecord, NormalizedParent, Nullable, Page } from './libs/core';
import { DEFAULT_DOCS_PAGE_LIMIT } from './libs/constants';
import { assertCursor, assertLimit, assertTypeQualifier, assertUuidQualifier } from './libs/parameter-validators';
import { validatePersonInput } from './input';
import { InvalidArgumentError } from './libs/error';

/** */
export namespace v1 {
  /**
   * Immutable data about a person contact.
   */
  export interface Person extends Contact.v1.Contact {
    readonly date_of_birth?: Date;
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
     * @returns a person doc
     * @throws InvalidArgumentError if the input does not contain required fields
     * @throws InvalidArgumentError if the input's parent field is not one of the allowed parents in the config
     * @throws InvalidArgumentError if the required fields do not have the expected type
     */
    const curriedFn = async (input: unknown): Promise<Person> => {
      const personInput = validatePersonInput(input);
      return fn(personInput);
    };
    return curriedFn;
  };

  /**
   * Returns a function for updating a person from the given data context.
   * @param context the current data context
   * @returns a function for updating a person.
   * @throws Error if a data context is not provided
   */
  export const update = (context: DataContext): typeof curriedFn => {
    assertDataContext(context);
    const fn = adapt(context, Local.Person.v1.update, Remote.Person.v1.update);
    /**
     * Returns the updated Person Doc for the provided updateInput
     * @param updateInput the Doc containing updated fields
     * @returns updated person Doc
     * @throws InvalidArgumentError if updateInput has changes in immutable fields
     * @throws InvalidArgumentError if updateInput does not contain required fields
     * @throws InvalidArgumentError if updateInput fields are not of expected type
     */
    const curriedFn = async (updateInput: unknown): Promise<Person> => {
      if (!isRecord(updateInput)) {
        throw new InvalidArgumentError('Invalid person update input');
      }
      return fn(updateInput);
    };
    return curriedFn;
  };
}
