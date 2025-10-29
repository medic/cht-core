import { LocalDataContext } from './libs/data-context';
import { getDocById } from './libs/doc';
import { UuidQualifier } from '../qualifier';
import { hasField, Nullable } from '../libs/core';
import * as TargetInterval from '../target-interval';
import logger from '@medic/logger';
import { Doc } from '../libs/doc';

/** @internal */
export namespace v1 {
  const isTargetInterval = (doc: Nullable<Doc>, uuid: string): doc is TargetInterval.v1.TargetInterval => {
    if (!doc) {
      logger.warn(`No target interval found for identifier [${uuid}].`);
      return false;
    }
    const valid = hasField(doc, { name: 'user', type: 'string' })
      && hasField(doc, { name: 'owner', type: 'string' })
      && hasField(doc, { name: 'reporting_period', type: 'string' })
      && hasField(doc, { name: 'updated_date', type: 'number' })
      && Array.isArray(doc.targets);
    if (!valid) {
      logger.warn(`Document [${uuid}] is not a valid target interval.`);
    }
    return valid;
  };

  /** @internal */
  export const get = ({ medicDb }: LocalDataContext) => {
    const getMedicDocById = getDocById(medicDb);

    return async (
      { uuid }: UuidQualifier
    ): Promise<Nullable<TargetInterval.v1.TargetInterval>> => {
      const doc = await getMedicDocById(uuid);
      if (!isTargetInterval(doc, uuid)) {
        return null;
      }
      return doc;
    };
  };
}
