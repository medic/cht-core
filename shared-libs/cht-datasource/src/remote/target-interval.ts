import { getResource, getResources, RemoteDataContext } from './libs/data-context';
import {
  ContactUuidQualifier,
  ContactUuidsQualifier,
  isContactUuidQualifier,
  ReportingPeriodQualifier,
  UuidQualifier
} from '../qualifier';
import { Nullable, Page } from '../libs/core';
import * as Target from '../target-interval';

/** @internal */
export namespace v1 {
  
  /** @internal */
  export const get = (remoteContext: RemoteDataContext) => {
    const getTarget = getResource(remoteContext, 'api/v1/target-interval');
    return (
      identifier: UuidQualifier
    ): Promise<Nullable<Target.v1.Target>> => getTarget(identifier.uuid);
  };
  
  /** @internal */
  export const getPage = (remoteContext: RemoteDataContext) => (
    qualifier: ReportingPeriodQualifier & (ContactUuidsQualifier | ContactUuidQualifier),
    cursor: Nullable<string>,
    limit: number,
  ): Promise<Page<Target.v1.Target>> => {
    const getTargets = getResources(remoteContext, 'api/v1/target-interval');
    const uuidParam: { contact_uuid: string } | { contact_uuids: string } = isContactUuidQualifier(qualifier)
      ? { contact_uuid: qualifier.contactUuid }
      : { contact_uuids: qualifier.contactUuids.join(',') };

    const queryParams = {
      'limit': limit.toString(),
      'reporting_period': qualifier.reportingPeriod,
      ...uuidParam,
      ...(cursor ? { cursor } : {})
    };
    
    return getTargets(queryParams);
  };
}
