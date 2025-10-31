import { getResource, getResources, postResource, putResource, RemoteDataContext } from './libs/data-context';
import { FreetextQualifier, UuidQualifier } from '../qualifier';
import * as Report from '../report';
import { Nullable, Page } from '../libs/core';
import * as Input from '../input';

/** @internal */
export namespace v1 {
  const getReport = (remoteContext: RemoteDataContext) => getResource(remoteContext, 'api/v1/report');

  const getReportUuids = (remoteContext: RemoteDataContext) => getResources(remoteContext, 'api/v1/report/uuid');

  const createReport = (remoteContext: RemoteDataContext) => postResource(remoteContext, 'api/v1/report');

  const updateReport = (remoteContext: RemoteDataContext) => putResource(remoteContext, `api/v1/report`);

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
  export const create = (remoteContext: RemoteDataContext) => (
    input: Input.v1.ReportInput
  ): Promise<Report.v1.Report> => createReport(remoteContext)(input);

  /** @internal */
  export const update = (remoteContext: RemoteDataContext) => (
    input: Record<string, unknown>
  ): Promise<Report.v1.Report> => updateReport(remoteContext)(input);

  /** @internal */
  export const getWithLineage = (remoteContext: RemoteDataContext) => (
    identifier: UuidQualifier
  ): Promise<Nullable<Report.v1.ReportWithLineage>> => {
    const queryParams = { with_lineage: 'true' };
    return getReport(remoteContext)(identifier.uuid, queryParams);
  };
}
