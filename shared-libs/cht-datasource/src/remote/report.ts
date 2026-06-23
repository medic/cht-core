import {
  getPageQueryParams,
  getResource,
  getResources,
  postResource,
  putResource,
  RemoteDataContext
} from './libs/data-context';
import { FreetextQualifier, IdsQualifier, UuidQualifier } from '../qualifier';
import * as Report from '../report';
import { Nullable, Page } from '../libs/core';

/** @internal */
export namespace v1 {
  const getReport = (remoteContext: RemoteDataContext) => getResource(remoteContext, 'api/v1/report');

  const getReports = (remoteContext: RemoteDataContext) => getResources(remoteContext, 'api/v1/report');

  const getReportUuids = (remoteContext: RemoteDataContext) => getResources(remoteContext, 'api/v1/report/uuid');

  /** @internal */
  export const get = (remoteContext: RemoteDataContext) => (
    identifier: UuidQualifier
  ): Promise<Nullable<Report.v1.Report>> => getReport(remoteContext)(identifier.uuid);

  const getReportQueryParams = (
    qualifier: FreetextQualifier,
    cursor: Nullable<string>,
    limit: number
  ): Record<string, string> => getPageQueryParams(cursor, limit, { freetext: qualifier.freetext });

  /** @internal */
  export const getUuidsPage = (remoteContext: RemoteDataContext) => (
    qualifier: FreetextQualifier,
    cursor: Nullable<string>,
    limit: number
  ): Promise<Page<string>> => getReportUuids(remoteContext)(getReportQueryParams(qualifier, cursor, limit));

  /** @internal */
  export const getPage = (remoteContext: RemoteDataContext) => (
    // When an IdsQualifier is provided the requested reports are returned; otherwise all reports are returned.
    qualifier: IdsQualifier | undefined,
    cursor: Nullable<string>,
    limit: number
  ): Promise<Page<Report.v1.Report>> => {
    const idsParams: Record<string, string> = qualifier ? { ids: qualifier.ids.join(',') } : {};
    return getReports(remoteContext)(getPageQueryParams(cursor, limit, idsParams));
  };

  /** @internal */
  export const create = postResource('api/v1/report');

  /** @internal */
  export const update = putResource(`api/v1/report`);

  /** @internal */
  export const getWithLineage = (remoteContext: RemoteDataContext) => (
    identifier: UuidQualifier
  ): Promise<Nullable<Report.v1.ReportWithLineage>> => {
    const queryParams = { with_lineage: 'true' };
    return getReport(remoteContext)(identifier.uuid, queryParams);
  };
}
