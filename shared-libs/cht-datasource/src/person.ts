import { ContactTypeQualifier, isContactTypeQualifier, isUuidQualifier, UuidQualifier } from './qualifier';
import { adapt, assertDataContext, DataContext, getDocumentStream } from './libs/data-context';
import { Contact, NormalizedParent } from './libs/contact';
import * as Remote from './remote';
import * as Local from './local';
import * as Place from './place';
import { LocalDataContext } from './local/libs/data-context';
import { RemoteDataContext } from './remote/libs/data-context';

/** */
export namespace v1 {
  /**
   * Immutable data about a person contact.
   */
  export interface Person extends Contact {
    readonly date_of_birth?: Date;
    readonly phone?: string;
    readonly patient_id?: string;
    readonly sex?: string;
  }

  /**
   * Immutable data about a person contact, including the full records of the parent place lineage.
   */
  export interface PersonWithLineage extends Person {
    readonly parent?: Place.v1.PlaceWithLineage | NormalizedParent,
  }

  const assertPersonQualifier: (qualifier: unknown) => asserts qualifier is UuidQualifier = (qualifier: unknown) => {
    if (!isUuidQualifier(qualifier)) {
      throw new Error(`Invalid identifier [${JSON.stringify(qualifier)}].`);
    }
  };

  const assertTypeQualifier: (qualifier: unknown) => asserts qualifier is ContactTypeQualifier = (
    qualifier: unknown
  ) => {
    if (!isContactTypeQualifier(qualifier)) {
      throw new Error(`Invalid type [${JSON.stringify(qualifier)}].`);
    }
  };

  const assertLimitAndSkip = (limit: unknown, skip: unknown) => {
    if (typeof limit !== 'number' || limit <= 0) {
      throw new Error('limit must be a positive number');
    }
    if (typeof skip !== 'number' || skip < 0) {
      throw new Error('skip must be a non-negative number');
    }
  };

  const getPerson = <T>(
    localFn: (c: LocalDataContext) => (qualifier: UuidQualifier) => Promise<T>,
    remoteFn: (c: RemoteDataContext) => (qualifier: UuidQualifier) => Promise<T>
  ) => (context: DataContext) => {
      assertDataContext(context);
      const fn = adapt(context, localFn, remoteFn);
      return async (qualifier: UuidQualifier): Promise<T> => {
        assertPersonQualifier(qualifier);
        return fn(qualifier);
      };
    };

  const getPeople = <T>(
    localFn: (c: LocalDataContext) => (personType: ContactTypeQualifier, limit: number, skip: number) => Promise<T>,
    remoteFn: (c: RemoteDataContext) => (personType: ContactTypeQualifier, limit: number, skip: number) => Promise<T>
  ) => (context: DataContext) => {
      assertDataContext(context);
      const fn = adapt(context, localFn, remoteFn);

      /**
       * Returns an array of people for the provided page specifications.
       * @param params the function parameters
       * @param params.personType the type of people to return
       * @param params.limit the maximum number of people to return. Default is 100.
       * @param params.skip the number of people to skip. Default is 0.
       * @returns an array of people for the provided page specifications.
       * @throws Error if no type is provided or if the type is not for a person
       * @throws Error if the provided `limit` value is `<=0`
       * @throws Error if the provided `skip` value is `<0`
       */
      const curriedFn = async ({personType, limit = 100, skip = 0}: {
        personType: ContactTypeQualifier;
        limit?: number;
        skip?: number;
      }): Promise<T> => {
        assertTypeQualifier(personType);
        assertLimitAndSkip(limit, skip);

        return fn(personType, limit, skip);
      };
      return curriedFn;
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
   */
  export const getPage = getPeople(Local.Person.v1.getPage, Remote.Person.v1.getPage);

  /**
   * Returns a generator function for retrieving people from the given data context.
   * @param context the current data context
   * @returns a generator function for retrieving people
   * @throws Error if a data context is not provided
   */
  export const getAll = (
    context: DataContext
  ): (personType: ContactTypeQualifier) => AsyncGenerator<v1.Person, void> => {
    assertDataContext(context);

    return async function* (personType: ContactTypeQualifier): AsyncGenerator<Person, void> {
      assertTypeQualifier(personType);
      const getPage = context.bind(v1.getPage);
      const limit = 100;
      const skip = 0;
      yield* getDocumentStream(getPage, { personType, limit, skip });
    };
  };
}
