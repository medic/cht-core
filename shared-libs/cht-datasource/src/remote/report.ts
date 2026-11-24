import { getResource, getResources, postResource, putResource, RemoteDataContext } from './libs/data-context';
import {
  FormsQualifier,
  FreetextQualifier,
  IdsQualifier,
  isFreetextQualifier,
  UuidQualifier,
  VerificationQualifier
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

  /** @internal */
  export const getUuidsPage = (remoteContext: RemoteDataContext) => (
    qualifier: FreetextQualifier | FormsQualifier | VerificationQualifier,
    cursor: Nullable<string>,
    limit: number
  ): Promise<Page<string>> => {
    let qualifierParam: Record<string, string>;
    if (isFreetextQualifier(qualifier)) {
      qualifierParam = { freetext: qualifier.freetext };
    } else if ('forms' in qualifier) {
      // Form codes use the established comma-joined query format and are not normalized.
      qualifierParam = { form: qualifier.forms.join(',') };
    } else {
      qualifierParam = {
        verification: qualifier.verification === null ? 'null' : qualifier.verification.toString()
      };
    }

    const queryParams = {
      limit: limit.toString(),
      ...qualifierParam,
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
