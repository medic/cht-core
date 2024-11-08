import {getResource, RemoteDataContext} from './libs/data-context';
import {UuidQualifier} from '../qualifier';
import * as Report from '../report';
import {Nullable} from '../libs/core';

/** @internal */
export namespace v1 {
  const getReport = (remoteContext: RemoteDataContext) => getResource(remoteContext, 'api/v1/report');
  
  /** @internal */
  export const get = (remoteContext: RemoteDataContext) => (
    identifier: UuidQualifier
  ): Promise<Nullable<Report.v1.Report>> => getReport(remoteContext)(identifier.uuid);
}
