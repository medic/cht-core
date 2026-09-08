import { getResource, getResources, postResource, putResource, RemoteDataContext } from './libs/data-context';
import {
  FormsQualifier,
  FreetextQualifier,
  IdsQualifier,
  isFormsQualifier,
  isFreetextQualifier,
  isIdsQualifier,
  SubjectsQualifier,
  UuidQualifier
} from '../qualifier';
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

  // Every qualifier hits the same route, differing only in which parameter it sets - the shape
  // `?freetext=` already established. Freetext is matched first, then forms, so existing callers are
  // unchanged. Lists are comma-joined rather than repeated, matching how `ids` is sent on
  // `api/v1/report`. Neither form codes nor subject identifiers are normalized, so a value containing
  // a comma could not round-trip; the view keys are the raw document values, and neither CHT form
  // codes nor the shortcodes/UUIDs that identify a subject contain commas.
  const getQualifierParam = (
    qualifier: FreetextQualifier | FormsQualifier | SubjectsQualifier
  ): Record<string, string> => {
    if (isFreetextQualifier(qualifier)) {
      return { freetext: qualifier.freetext };
    }
    if (isFormsQualifier(qualifier)) {
      return { form: qualifier.forms.join(',') };
    }
    return { subject: qualifier.subjects.join(',') };
  };

  /** @internal */
  export const getUuidsPage = (remoteContext: RemoteDataContext) => (
    qualifier: FreetextQualifier | FormsQualifier | SubjectsQualifier,
    cursor: Nullable<string>,
    limit: number
  ): Promise<Page<string>> => {
    const queryParams = {
      limit: limit.toString(),
      ...getQualifierParam(qualifier),
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
    qualifier: IdsQualifier | SubjectsQualifier,
    cursor: Nullable<string>,
    limit: number
  ): Promise<Page<Report.v1.Report>> => {
    // Ids are matched first so existing callers are unchanged. The subject list is comma-joined the
    // same way, and the same route serves both, mirroring `?freetext=`/`?form=`/`?subject=` on the uuid
    // endpoint.
    const queryParams = {
      limit: limit.toString(),
      ...(isIdsQualifier(qualifier)
        ? { ids: qualifier.ids.join(',') }
        : { subject: qualifier.subjects.join(',') }),
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
