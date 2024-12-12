import {
  assertCursor,
  assertFreetextQualifier,
  assertLimit,
  DataObject,
  getPagedGenerator,
  Nullable,
  Page
} from './libs/core';
import { adapt, assertDataContext, DataContext } from './libs/data-context';
import { Doc } from './libs/doc';
import { InvalidArgumentError } from './libs/error';
import * as Local from './local';
import { FreetextQualifier, isUuidQualifier, UuidQualifier } from './qualifier';
import * as Remote from './remote';
import { DEFAULT_REPORT_PAGE_LIMIT } from './libs/constants';

/** */
export namespace v1 {
  /**
   * A report document.
   */
  export interface Report extends Doc {
    readonly form: string;
    readonly reported_date: Date;
    readonly fields: DataObject;
  }

  const assertReportQualifier: (qualifier: unknown) => asserts qualifier is UuidQualifier = (qualifier: unknown) => {
    if (!isUuidQualifier(qualifier)) {
      throw new InvalidArgumentError(`Invalid identifier [${JSON.stringify(qualifier)}].`);
    }
  };

  /**
   * Returns a function for retrieving a report from the given data context.
   * @param context the current data context
   * @returns a function for retrieving a report
   * @throws Error if a data context is not provided
   */
  export const get = (context: DataContext): typeof curriedFn => {
    assertDataContext(context);
    const fn = adapt(context, Local.Report.v1.get, Remote.Report.v1.get);

    /**
     * Returns a report for the given qualifier.
     * @param qualifier identifier for the report to retrieve
     * @returns the report or `null` if no report is found for the qualifier
     * @throws Error if the qualifier is invalid
     */
    const curriedFn = async (
      qualifier: UuidQualifier
    ): Promise<Nullable<Report>> => {
      assertReportQualifier(qualifier);
      return fn(qualifier);
    };
    return curriedFn;
  };

  /**
   * Returns a function for retrieving a paged array of report identifiers from the given data context.
   * @param context the current data context
   * @returns a function for retrieving a paged array of report identifiers
   * @throws Error if a data context is not provided
   * @see {@link getIds} which provides the same data, but without having to manually account for paging
   */
  export const getIdsPage = (context: DataContext): typeof curriedFn => {
    assertDataContext(context);
    const fn = adapt(context, Local.Report.v1.getPage, Remote.Report.v1.getPage);

    /**
     * Returns an array of report identifiers for the provided page specifications.
     * @param qualifier the limiter defining which identifiers to return
     * @param cursor the token identifying which page to retrieve. A `null` value indicates the first page should be
     * returned. Subsequent pages can be retrieved by providing the cursor returned with the previous page.
     * @param limit the maximum number of identifiers to return. Default is 10000.
     * @returns a page of report identifiers for the provided specification
     * @throws InvalidArgumentError if no qualifier is provided or if the qualifier is invalid
     * @throws InvalidArgumentError if the provided `limit` value is `<=0`
     * @throws InvalidArgumentError if the provided cursor is not a valid page token or `null`
     */
    const curriedFn = async (
      qualifier: FreetextQualifier,
      cursor: Nullable<string> = null,
      limit: number | `${number}` = DEFAULT_REPORT_PAGE_LIMIT
    ): Promise<Page<string>> => {
      assertFreetextQualifier(qualifier);
      assertCursor(cursor);
      assertLimit(limit);

      return fn(qualifier, cursor, Number(limit));
    };
    return curriedFn;
  };

  /**
   * Returns a function for getting a generator that fetches report identifiers from the given data context.
   * @param context the current data context
   * @returns a function for getting a generator that fetches report identifiers
   * @throws Error if a data context is not provided
   */
  export const getIds = (context: DataContext): typeof curriedGen => {
    assertDataContext(context);
    const getPage = context.bind(v1.getIdsPage);

    /**
     * Returns a generator for fetching all report identifiers that match the given qualifier
     * @param qualifier the limiter defining which identifiers to return
     * @returns a generator for fetching all report identifiers that match the given qualifier
     * @throws InvalidArgumentError if no qualifier is provided or if the qualifier is invalid
     */
    const curriedGen = (
      qualifier: FreetextQualifier
    ): AsyncGenerator<string, null> => {
      assertFreetextQualifier(qualifier);

      return getPagedGenerator(getPage, qualifier);
    };
    return curriedGen;
  };
}
