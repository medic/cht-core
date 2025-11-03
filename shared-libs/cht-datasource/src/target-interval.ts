import { DataObject, getPagedGenerator, Nullable, Page } from './libs/core';
import { Doc } from './libs/doc';
import { adapt, assertDataContext, DataContext } from './libs/data-context';
import {
  byUuid,
  ContactUuidQualifier, ContactUuidsQualifier, isContactUuidQualifier, 
  isReportingPeriodQualifier, 
  isUsernameQualifier,
  isUuidQualifier,
  ReportingPeriodQualifier,
  UsernameQualifier,
  UuidQualifier
} from './qualifier';
import * as Local from './local';
import * as Remote from './remote';
import { InvalidArgumentError } from './libs/error';
import { DEFAULT_DOCS_PAGE_LIMIT } from './libs/constants';
import { assertCursor, assertLimit, assertTargetIntervalQualifier } from './libs/parameter-validators';

const getTargetIntervalUuid = (
  identifier: (ReportingPeriodQualifier & ContactUuidQualifier & UsernameQualifier) | UuidQualifier
): UuidQualifier => {
  if (isUuidQualifier(identifier)) {
    return identifier;
  }
  if (!(
    isReportingPeriodQualifier(identifier)
    && isContactUuidQualifier(identifier)
    && isUsernameQualifier(identifier)
  )) {
    throw new InvalidArgumentError(`Invalid target interval qualifier [${JSON.stringify(identifier)}].`);
  }

  return byUuid(
    `target~${identifier.reportingPeriod}~${identifier.contactUuid}~org.couchdb.user:${identifier.username}`
  );
};

/** */
export namespace v1 {

  /**
   * Data from an interval about a particular target for a user.
   */
  export interface Target extends DataObject {
    readonly id: string;
    readonly value: {
      readonly pass: number;
      readonly total: number;
      readonly percent?: number;
    }
  }

  /**
   * Data about a user's targets from a particular interval.
   */
  export interface TargetInterval extends Doc {
    readonly user: string;
    readonly owner: string;
    readonly reporting_period: string;
    readonly updated_date: number;
    readonly targets: Target[];
  }

  /**
   * Returns a target interval for the given qualifier.
   * @param context the current data context
   * @returns the target interval or `null` if no target interval is found for the qualifier
   * @throws Error if no context is provided or if the context is invalid
   */
  export const get = (
    context: DataContext
  ): typeof curredFn => {
    assertDataContext(context);
    const fn = adapt(context, Local.TargetInterval.v1.get, Remote.TargetInterval.v1.get);

    /**
     * Returns the target interval identified by the given qualifier.
     * @param qualifier the limiter defining which target interval to return
     * @returns the identified target interval
     * @throws InvalidArgumentError if no qualifier is provided or if the qualifier is invalid
     */
    const curredFn = async (
      qualifier: (ReportingPeriodQualifier & ContactUuidQualifier & UsernameQualifier) | UuidQualifier
    ): Promise<Nullable<TargetInterval>> => {
      const identifier = getTargetIntervalUuid(qualifier);
      return fn(identifier);
    };
    return curredFn;
  };

  /**
   * Returns a function for retrieving a paged array of target intervals from the given data context.
   * @param context the current data context
   * @returns a function for retrieving a paged array of target intervals
   * @throws Error if a data context is not provided
   * @see {@link getAll} which provides the same data, but without having to manually account for paging
   */
  export const getPage = (context: DataContext): typeof curriedFn => {
    assertDataContext(context);
    const fn = adapt(context, Local.TargetInterval.v1.getPage, Remote.TargetInterval.v1.getPage);

    /**
     * Returns an array of target intervals for the provided page specifications.
     * @param qualifier the limiter defining which target intervals to return
     * @param cursor the token identifying which page to retrieve. A `null` value indicates the first page should be
     * returned. Subsequent pages can be retrieved by providing the cursor returned with the previous page.
     * @param limit the maximum number of identifiers to return. Default is 100.
     * @returns a page of target intervals for the provided specification
     * @throws InvalidArrgumentError if no qualifier is provided or if the qualifier is invalid
     * @throws InvalidArgumentError if the provided `limit` value is `<=0`
     * @throws InvalidArgumentError if the provided cursor is not a valid page token or `null`
     */
    const curriedFn = async (
      qualifier: ReportingPeriodQualifier & ContactUuidsQualifier,
      cursor: Nullable<string> = null,
      limit: number | `${number}` = DEFAULT_DOCS_PAGE_LIMIT
    ): Promise<Page<TargetInterval>> => {
      assertTargetIntervalQualifier(qualifier);
      assertCursor(cursor);
      assertLimit(limit);
      
      return fn(qualifier, cursor, Number(limit));
    };
    return curriedFn;
  };

  /**
   * Returns a function for getting a generator that fetches target intervals from the given data context.
   * @param context the current data context
   * @returns a function for getting a generator that fetches target intervals
   * @throws Error if a data context is not provided
   */
  export const getAll = (context: DataContext): typeof curriedGen => {
    assertDataContext(context);
    
    /**
     * Returns a generator for fetching all target intervals that match the given qualifier
     * @param qualifier the limiter defining which target intervals to return
     * @returns a generator for fetching all target intervals that match the given qualifier
     * @throws InvalidArgumentError if no qualifier is provided or if the qualifier is invalid
     */
    const curriedGen = (
      qualifier: ReportingPeriodQualifier & ContactUuidsQualifier,
    ): AsyncGenerator<TargetInterval, null> => {
      assertTargetIntervalQualifier(qualifier);
      
      const getPage = context.bind(v1.getPage);
      return getPagedGenerator(getPage, qualifier);
    };
    return curriedGen;
  };
}
