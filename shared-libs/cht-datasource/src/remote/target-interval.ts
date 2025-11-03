import { getResource, getResources, RemoteDataContext } from './libs/data-context';
import { ContactUuidsQualifier, ReportingPeriodQualifier, UuidQualifier } from '../qualifier';
import { Nullable, Page } from '../libs/core';
import * as TargetInterval from '../target-interval';

/** @internal */
export namespace v1 {
  
  /** @internal */
  export const get = (remoteContext: RemoteDataContext) => {
    const getTargetInterval = getResource(remoteContext, 'api/v1/target-interval');
    return (
      identifier: UuidQualifier
    ): Promise<Nullable<TargetInterval.v1.TargetInterval>> => getTargetInterval(identifier.uuid);
  };
  
  export const getPage = (remoteContext: RemoteDataContext) => (
    qualifier: ReportingPeriodQualifier & ContactUuidsQualifier,
    cursor: Nullable<string>,
    limit: number,
  ): Promise<Page<TargetInterval.v1.TargetInterval>> => {
    const getTargetIntervals = getResources(remoteContext, 'api/v1/target-interval');
    const queryParams = {
      'limit': limit.toString(),
      'reporting_period': qualifier.reportingPeriod,
      'contact_uuids': qualifier.contactUuids.join(','),
      ...(cursor ? { cursor } : {})
    };
    
    return getTargetIntervals(queryParams);
  };
}
