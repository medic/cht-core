import { LocalDataContext } from './libs/data-context';
import { fetchAndFilter, getDocById, getDocsByIds, getDocIdsByIdRange } from './libs/doc';
import {
  ContactIdQualifier,
  ContactIdsQualifier, IdQualifier,
  isContactIdQualifier,
  ReportingPeriodQualifier,
} from '../qualifier';
import { hasField, isRecord, Nullable, Page } from '../libs/core';
import * as Target from '../target';
import logger from '@medic/logger';
import { Doc } from '../libs/doc';
import { validateCursor } from './libs/core';

const getTargetIds = async (
  getDocIdsRange: ReturnType<typeof getDocIdsByIdRange>,
  qualifier: ReportingPeriodQualifier & (ContactIdsQualifier | ContactIdQualifier)
) => {
  const contactIdSet = new Set(
    isContactIdQualifier(qualifier) ? [qualifier.contactId] : qualifier.contactIds
  );

  if (contactIdSet.size === 1) {
    const contactId = contactIdSet.values().next().value!;
    return getDocIdsRange(
      `target~${qualifier.reportingPeriod}~${contactId}~`,
      `target~${qualifier.reportingPeriod}~${contactId}~\ufff0`,
    );
  }

  const allTargetIds = await getDocIdsRange(
    `target~${qualifier.reportingPeriod}~`,
    `target~${qualifier.reportingPeriod}~\ufff0`,
  );
  return allTargetIds.filter(id => {
    const [, , contactId] = id.split('~');
    return contactIdSet.has(contactId);
  });
};

/** @internal */
export namespace v1 {
  const isTarget = (doc: Nullable<Doc>): doc is Target.v1.Target => {
    return isRecord(doc)
      && doc.type === 'target'
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
      { id }: IdQualifier
    ): Promise<Nullable<Target.v1.Target>> => {
      const doc = await getMedicDocById(id);
      if (!isTarget(doc)) {
        logger.warn(`Document [${id}] is not a valid target.`);
        return null;
      }
      return doc;
    };
  };

  /** @internal */
  export const getPage = ({ medicDb }: LocalDataContext) => {
    const getDocIdsRange = getDocIdsByIdRange(medicDb);
    const getMedicDocsByIds = getDocsByIds(medicDb);

    return async (
      qualifier: ReportingPeriodQualifier & (ContactIdsQualifier | ContactIdQualifier),
      cursor: Nullable<string>,
      limit: number,
    ): Promise<Page<Target.v1.Target>> => {
      const skip = validateCursor(cursor);
      const targetIds = await getTargetIds(getDocIdsRange, qualifier);
      if (!targetIds.length) {
        return { data: [], cursor: null };
      }

      const getFn = async (limit: number, skip: number) => {
        const ids = targetIds.slice(skip, skip + limit);
        return getMedicDocsByIds(ids);
      };
      return fetchAndFilter(
        getFn,
        isTarget,
        limit
      )(limit, skip) as Promise<Page<Target.v1.Target>>;
    };
  };
}
