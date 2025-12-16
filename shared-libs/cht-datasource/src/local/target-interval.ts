import { LocalDataContext } from './libs/data-context';
import { fetchAndFilter, getDocById, getDocsByIds, getDocUuidsByIdRange } from './libs/doc';
import { ContactUuidsQualifier, ReportingPeriodQualifier, UuidQualifier } from '../qualifier';
import { hasField, isRecord, Nullable, Page } from '../libs/core';
import * as TargetInterval from '../target-interval';
import logger from '@medic/logger';
import { Doc } from '../libs/doc';
import { validateCursor } from './libs/core';

/** @internal */
export namespace v1 {
  const isTargetInterval = (doc: Nullable<Doc>): doc is TargetInterval.v1.TargetInterval => {
    return isRecord(doc)
      && hasField(doc, { name: 'user', type: 'string' })
      && hasField(doc, { name: 'owner', type: 'string' })
      && hasField(doc, { name: 'reporting_period', type: 'string' })
      && hasField(doc, { name: 'updated_date', type: 'number' })
      && Array.isArray(doc.targets);
  };

  /** @internal */
  export const get = ({ medicDb }: LocalDataContext) => {
    const getMedicDocById = getDocById(medicDb);

    return async (
      { uuid }: UuidQualifier
    ): Promise<Nullable<TargetInterval.v1.TargetInterval>> => {
      const doc = await getMedicDocById(uuid);
      if (!isTargetInterval(doc)) {
        logger.warn(`Document [${uuid}] is not a valid target interval.`);
        return null;
      }
      return doc;
    };
  };

  /** @internal */
  export const getPage = ({ medicDb }: LocalDataContext) => {
    const getDocUuidsRange = getDocUuidsByIdRange(medicDb);
    const getMedicDocsByIds = getDocsByIds(medicDb);

    return async (
      qualifier: (ReportingPeriodQualifier & ContactUuidsQualifier),
      cursor: Nullable<string>,
      limit: number,
    ): Promise<Page<TargetInterval.v1.TargetInterval>> => {
      const skip = validateCursor(cursor);
      const contactUuidSet = new Set(qualifier.contactUuids);
      const targetIntervalIds = await getDocUuidsRange(
        `target~${qualifier.reportingPeriod}~`,
        `target~${qualifier.reportingPeriod}~\ufff0`,
      ).then(ids => ids.filter(id => {
        const [, , contactUuid] = id.split('~');
        return contactUuidSet.has(contactUuid);
      }));
      if (!targetIntervalIds.length) {
        return { data: [], cursor: null };
      }

      const getFn = async (limit: number, skip: number) => {
        const ids = targetIntervalIds.slice(skip, skip + limit);
        return getMedicDocsByIds(ids);
      };
      return fetchAndFilter(
        getFn,
        isTargetInterval,
        limit
      )(limit, skip) as Promise<Page<TargetInterval.v1.TargetInterval>>;
    };
  };
}
