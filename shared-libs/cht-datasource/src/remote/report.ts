import { getResource, RemoteDataContext, getResources, postResource, putResource } from './libs/data-context';
import { FreetextQualifier, UuidQualifier, ReportQualifier } from '../qualifier';
import * as Report from '../report';
import { Nullable, Page } from '../libs/core';

/** @internal */
export namespace v1 {
  const getReport = (remoteContext: RemoteDataContext) => getResource(remoteContext, 'api/v1/report');

  const getReportUuids = (remoteContext: RemoteDataContext) => getResources(remoteContext, 'api/v1/report/uuid');
  
  /** @internal */
  export const get = (remoteContext: RemoteDataContext) => (
    identifier: UuidQualifier
  ): Promise<Nullable<Report.v1.Report>> => getReport(remoteContext)(identifier.uuid);

  /** @internal */
  export const getUuidsPage = (remoteContext: RemoteDataContext) => (
    qualifier: FreetextQualifier,
    cursor: Nullable<string>,
    limit: number
  ): Promise<Page<string>> => {
    const queryParams = {
      limit: limit.toString(),
      freetext: qualifier.freetext,
      ...(cursor ? { cursor } : {}),
    };
    return getReportUuids(remoteContext)(queryParams);
  };

  /** @internal */
  export const getWithLineage = (remoteContext: RemoteDataContext) => (
    identifier: UuidQualifier
  ): Promise<Nullable<Report.v1.ReportWithLineage>> => {
    const queryParams = { with_lineage: 'true' };
    return getReport(remoteContext)(identifier.uuid, queryParams);
  };

  /** @internal */
  export const create = (remoteContext: RemoteDataContext) => (
    qualifier: ReportQualifier
  ): Promise<Report.v1.Report> => {
    const createReport = postResource(remoteContext, 'api/v1/report');
    return createReport<Report.v1.Report>(qualifier as Record<string, unknown>);
  };

  /** @internal */
  export const update = (remoteContext: RemoteDataContext) => (
    qualifier: ReportQualifier
  ): Promise<Report.v1.Report> => {
    // No validation here - API server will call local implementation which validates
    const updateReport = putResource(remoteContext, 'api/v1/report');
    const id = qualifier._id!;
    return updateReport<Report.v1.Report>(id, qualifier as Record<string, unknown>);
  };
}
