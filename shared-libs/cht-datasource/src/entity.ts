import { UuidQualifier } from './qualifier';
import { adapt, assertDataContext, DataContext } from './libs/data-context';
import * as Remote from './remote';
import * as Local from './local';
import { LocalDataContext } from './local/libs/data-context';
import { RemoteDataContext } from './remote/libs/data-context';
import { assertUuidQualifier } from './libs/parameter-validators';

/** */
export namespace v1 {
  const getEntity =
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
   * Returns a generic database document for the given qualifier.
   * @param context the current data context
   * @returns the document or `null` if no document is found for the qualifier
   * @throws Error if the provided context or qualifier is invalid
   */
  export const get = getEntity(Local.Entity.v1.get, Remote.Entity.v1.get);
}
