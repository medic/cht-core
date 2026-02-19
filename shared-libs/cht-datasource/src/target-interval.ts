import { DataObject, getPagedGenerator, Nullable, Page } from './libs/core';
import { Doc } from './libs/doc';
import { adapt, assertDataContext, DataContext } from './libs/data-context';
import {
  byUuid,
  ContactUuidQualifier, ContactUuidsQualifier, isContactUuidQualifier, isContactUuidsQualifier,
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
import { assertCursor, assertLimit } from './libs/parameter-validators';

const getTargetId = (
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
    throw new InvalidArgumentError(`Invalid target qualifier [${JSON.stringify(identifier)}].`);
  }

  return byUuid(
    `target~${identifier.reportingPeriod}~${identifier.contactUuid}~org.couchdb.user:${identifier.username}`
  );
};

// eslint-disable-next-line func-style
function assertQualifierForGettingTargets (
  qualifier: unknown
): asserts qualifier is (ReportingPeriodQualifier & (ContactUuidsQualifier | ContactUuidQualifier)) {
  const isUuidQualifier = isContactUuidsQualifier(qualifier) !== isContactUuidQualifier(qualifier);
  if (!(isUuidQualifier && isReportingPeriodQualifier(qualifier))) {
    throw new InvalidArgumentError(`Invalid targets qualifier [${JSON.stringify(qualifier)}].`);
  }
}

/** */
export namespace v1 {

  /**
   * Data about a particular target for a user.
   */
  export interface TargetValue extends DataObject {
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
  export interface Target extends Doc {
    readonly user: string;
    readonly owner: string;
    readonly reporting_period: string;
    readonly updated_date: number;
    readonly targets: TargetValue[];
  }

  /**
   * Returns a target for the given qualifier.
   * @param context the current data context
   * @returns the target or `null` if no target is found for the qualifier
   * @throws Error if no context is provided or if the context is invalid
   */
  export const get = (
    context: DataContext
  ): typeof curredFn => {
    assertDataContext(context);
    const fn = adapt(context, Local.Target.v1.get, Remote.Target.v1.get);

    /**
     * Returns the target identified by the given qualifier.
     * @param qualifier the limiter defining which target to return
     * @returns the identified target
     * @throws InvalidArgumentError if no qualifier is provided or if the qualifier is invalid
     */
    const curredFn = async (
      qualifier: (ReportingPeriodQualifier & ContactUuidQualifier & UsernameQualifier) | UuidQualifier
    ): Promise<Nullable<Target>> => {
      const identifier = getTargetId(qualifier);
      return fn(identifier);
    };
    return curredFn;
  };

  /**
   * Returns a function for retrieving a paged array of targets from the given data context.
   * @param context the current data context
   * @returns a function for retrieving a paged array of targets
   * @throws Error if a data context is not provided
   * @see {@link getAll} which provides the same data, but without having to manually account for paging
   */
  export const getPage = (context: DataContext): typeof curriedFn => {
    assertDataContext(context);
    const fn = adapt(context, Local.Target.v1.getPage, Remote.Target.v1.getPage);

    /**
     * Returns an array of targets for the provided page specifications.
     * @param qualifier the limiter defining which targets to return
     * @param cursor the token identifying which page to retrieve. A `null` value indicates the first page should be
     * returned. Subsequent pages can be retrieved by providing the cursor returned with the previous page.
     * @param limit the maximum number of identifiers to return. Default is 100.
     * @returns a page of targets for the provided specification
     * @throws InvalidArrgumentError if no qualifier is provided or if the qualifier is invalid
     * @throws InvalidArgumentError if the provided `limit` value is `<=0`
     * @throws InvalidArgumentError if the provided cursor is not a valid page token or `null`
     */
    const curriedFn = async (
      qualifier: ReportingPeriodQualifier & (ContactUuidsQualifier | ContactUuidQualifier),
      cursor: Nullable<string> = null,
      limit: number | `${number}` = DEFAULT_DOCS_PAGE_LIMIT
    ): Promise<Page<Target>> => {
      assertQualifierForGettingTargets(qualifier);
      assertCursor(cursor);
      assertLimit(limit);
      
      return fn(qualifier, cursor, Number(limit));
    };
    return curriedFn;
  };

  /**
   * Returns a function for getting a generator that fetches targets from the given data context.
   * @param context the current data context
   * @returns a function for getting a generator that fetches targets
   * @throws Error if a data context is not provided
   */
  export const getAll = (context: DataContext): typeof curriedGen => {
    assertDataContext(context);
    
    /**
     * Returns a generator for fetching all targets that match the given qualifier
     * @param qualifier the limiter defining which targets to return
     * @returns a generator for fetching all targets that match the given qualifier
     * @throws InvalidArgumentError if no qualifier is provided or if the qualifier is invalid
     */
    const curriedGen = (
      qualifier: ReportingPeriodQualifier & (ContactUuidsQualifier | ContactUuidQualifier),
    ): AsyncGenerator<Target, null> => {
      assertQualifierForGettingTargets(qualifier);
      
      const getPage = context.bind(v1.getPage);
      return getPagedGenerator(getPage, qualifier);
    };
    return curriedGen;
  };
}
