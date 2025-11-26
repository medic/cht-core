import { DataObject, Nullable } from './libs/core';
import { Doc } from './libs/doc';
import { adapt, assertDataContext, DataContext } from './libs/data-context';
import {
  byUuid,
  ContactUuidQualifier, isContactUuidQualifier, isReportingPeriodQualifier, isUsernameQualifier,
  isUuidQualifier,
  ReportingPeriodQualifier,
  UsernameQualifier,
  UuidQualifier
} from './qualifier';
import * as Local from './local';
import * as Remote from './remote';
import { InvalidArgumentError } from './libs/error';

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
}
