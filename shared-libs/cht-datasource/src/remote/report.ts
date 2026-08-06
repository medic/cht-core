import { getResource, getResources, postResource, putResource, RemoteDataContext } from './libs/data-context';
import { FormQualifier, FreetextQualifier, IdsQualifier, isFreetextQualifier, UuidQualifier } from '../qualifier';
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

  const getReportUuidsByForm = (remoteContext: RemoteDataContext, form: string) => getResources(
    remoteContext,
    // The form code is a path segment, so it must be encoded. The value itself is not normalised.
    `api/v1/report/by-form/${encodeURIComponent(form)}`
  );

  /** @internal */
  export const getUuidsPage = (remoteContext: RemoteDataContext) => (
    qualifier: FreetextQualifier | FormQualifier,
    cursor: Nullable<string>,
    limit: number
  ): Promise<Page<string>> => {
    // Freetext is matched first so the behaviour of existing freetext callers is unchanged.
    if (isFreetextQualifier(qualifier)) {
      const queryParams = {
        limit: limit.toString(),
        freetext: qualifier.freetext,
        ...(cursor ? { cursor } : {}),
      };
      return getReportUuids(remoteContext)(queryParams);
    }

    const queryParams = {
      limit: limit.toString(),
      ...(cursor ? { cursor } : {}),
    };
    return getReportUuidsByForm(remoteContext, qualifier.form)(queryParams);
  };

  const postReportSummary = postResource('api/v1/report/summary');

  /** @internal */
  export const getSummaries = (
    remoteContext: RemoteDataContext
  ) => ({ ids }: IdsQualifier): Promise<Report.v1.ReportSummary[]> => {
    return postReportSummary(remoteContext)({ ids });
  };

  /** @internal */
  export const getPage = (remoteContext: RemoteDataContext) => (
    qualifier: IdsQualifier,
    cursor: Nullable<string>,
    limit: number
  ): Promise<Page<Report.v1.Report>> => {
    const queryParams = {
      limit: limit.toString(),
      ids: qualifier.ids.join(','),
      ...(cursor ? { cursor } : {}),
    };
    return getReports(remoteContext)(queryParams);
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
