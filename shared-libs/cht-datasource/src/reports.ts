import {Doc} from './libs/doc';
import {DataObject, Nullable, Page} from './libs/core';
import {DataContext} from './libs/data-context';
import {FreetextQualifier, UuidQualifier} from './qualifier';

export namespace v1 {
  /**
   * A report document.
   */
  interface Report extends Doc {
    readonly form: string;
    readonly reported_date: Date;
    readonly fields: DataObject;
  }

  // New REST api: /api/v1/report
  /**
   * Returns a function for retrieving a report from the given data context.
   * @param context the current data context
   * @returns a function for retrieving a report
   * @throws Error if a data context is not provided
   */
  /**
   * Returns a report for the given qualifier.
   * @param qualifier identifier for the report to retrieve
   * @returns the report or `null` if no report is found for the qualifier
   * @throws Error if the qualifier is invalid
   */
  const get = (context: DataContext) => (qualifier: UuidQualifier) => Promise<Nullable<Report>>;

  // New REST api: /api/v1/report/id
  /**
   * Returns a function for retrieving a paged array of report identifiers from the given data context.
   * @param context the current data context
   * @returns a function for retrieving a paged array of report identifiers
   * @throws Error if a data context is not provided
   * @see {@link getIdsAll} which provides the same data, but without having to manually account for paging
   */
  /**
   * Returns an array of report identifiers for the provided page specifications.
   * @param qualifier the limiter defining which identifiers to return
   * @param cursor the token identifying which page to retrieve. A `null` value indicates the first page should be
   * returned. Subsequent pages can be retrieved by providing the cursor returned with the previous page.
   * @param limit the maximum number of identifiers to return. Default is 10000.
   * @returns a page of report identifiers for the provided specification
   * @throws Error if no qualifier is provided or if the qualifier is invalid
   * @throws Error if the provided `limit` value is `<=0`
   * @throws Error if the provided cursor is not a valid page token or `null`
   */
  const getIdsPage = (context: DataContext) => (
    qualifier: FreetextQualifier, 
    cursor: Nullable<string>, 
    limit: number
  ) => Promise<Page<string>>;

  /**
   * Returns a function for getting a generator that fetches report identifiers from the given data context.
   * @param context the current data context
   * @returns a function for getting a generator that fetches report identifiers
   * @throws Error if a data context is not provided
   */
  /**
   * Returns a generator for fetching all report identifiers that match the given qualifier
   * @param qualifier the limiter defining which identifiers to return
   * @returns a generator for fetching all report identifiers that match the given qualifier
   * @throws Error if no qualifier is provided or if the qualifier is invalid
   */
  const getIdsAll = (context: DataContext) => (qualifier: FreetextQualifier) => AsyncGenerator<string, null>;
}
