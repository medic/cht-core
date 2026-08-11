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

  /** @internal */
  export const getUuidsPage = (remoteContext: RemoteDataContext) => (
    qualifier: FreetextQualifier | FormQualifier,
    cursor: Nullable<string>,
    limit: number
  ): Promise<Page<string>> => {
    // Both qualifiers hit the same route, differing only in which parameter they set — the shape
    // `?freetext=` already established. Freetext is matched first so existing callers are unchanged.
    const queryParams = {
      limit: limit.toString(),
      ...(isFreetextQualifier(qualifier)
        // Comma-joined rather than repeated, matching how `ids` is sent on `api/v1/report`. Form
        // codes are not normalised, so a code containing a comma could not round-trip; the view
        // key is the raw `doc.form` value and CHT form codes do not contain commas.
        ? { freetext: qualifier.freetext }
        : { form: qualifier.forms.join(',') }),
      ...(cursor ? { cursor } : {}),
    };
    return getReportUuids(remoteContext)(queryParams);
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
