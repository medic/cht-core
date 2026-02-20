import { getResource, getResources, RemoteDataContext } from './libs/data-context';
import {
  ContactIdQualifier,
  ContactIdsQualifier, IdQualifier,
  isContactIdQualifier,
  ReportingPeriodQualifier
} from '../qualifier';
import { Nullable, Page } from '../libs/core';
import * as Target from '../target';

/** @internal */
export namespace v1 {
  
  /** @internal */
  export const get = (remoteContext: RemoteDataContext) => {
    const getTarget = getResource(remoteContext, 'api/v1/target');
    return (
      identifier: IdQualifier
    ): Promise<Nullable<Target.v1.Target>> => getTarget(identifier.id);
  };
  
  /** @internal */
  export const getPage = (remoteContext: RemoteDataContext) => (
    qualifier: ReportingPeriodQualifier & (ContactIdsQualifier | ContactIdQualifier),
    cursor: Nullable<string>,
    limit: number,
  ): Promise<Page<Target.v1.Target>> => {
    const getTargets = getResources(remoteContext, 'api/v1/target');
    const idParam: { contact_id: string } | { contact_ids: string } = isContactIdQualifier(qualifier)
      ? { contact_id: qualifier.contactId }
      : { contact_ids: qualifier.contactIds.join(',') };

    const queryParams = {
      'limit': limit.toString(),
      'reporting_period': qualifier.reportingPeriod,
      ...idParam,
      ...(cursor ? { cursor } : {})
    };
    
    return getTargets(queryParams);
  };
}
