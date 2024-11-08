import {LocalDataContext, SettingsService} from './libs/data-context';
import { getDocById } from './libs/doc';
import { UuidQualifier } from '../qualifier';
import { Nullable } from '../libs/core';
import * as Report from '../report';
import { Doc } from '../libs/doc';
import logger from '@medic/logger';

/** @internal */
export namespace v1 {
  const isReport = () => (doc: Nullable<Doc>, uuid?: string): doc is Report.v1.Report => {
    if (!doc) {
      if (uuid) {
        logger.warn(`No report found for identifier [${uuid}].`);
        return false;
      }
    }

    return true;
  };

  /** @internal */
  export const get = ({ medicDb }: LocalDataContext) => {
    const getMedicDocById = getDocById(medicDb);
    return async (identifier: UuidQualifier): Promise<Nullable<Report.v1.Report>> => {
      const doc = await getMedicDocById(identifier.uuid);

      if (!isReport()(doc, identifier.uuid)) {
        return null;
      }
      return doc;
    };
  };
}
