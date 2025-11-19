import { LocalDataContext } from './libs/data-context';
import { fetchAndFilter, getDocById } from './libs/doc';
import { ContactUuidsQualifier, ReportingPeriodQualifier, UuidQualifier } from '../qualifier';
import { hasField, Nullable, Page } from '../libs/core';
import * as TargetInterval from '../target-interval';
import logger from '@medic/logger';
import { Doc } from '../libs/doc';
import { validateCursor } from './libs/core';

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

  /** @internal */
  export const getPage = ({ medicDb: db }: LocalDataContext) => {
    return async (
      qualifier: (ReportingPeriodQualifier & ContactUuidsQualifier),
      cursor: Nullable<string>,
      limit: number,
    ): Promise<Page<TargetInterval.v1.TargetInterval>> => {
      
      const skip = validateCursor(cursor);
      const uuids = (await fetchUuids(limit, skip)(db, qualifier)).data;

      return await fetchDocs(limit, skip)(db, uuids);
    };
  };
  
  const fetchUuids = (limit: number, skip: number) => async (
    db: PouchDB.Database, 
    qualifier: (ReportingPeriodQualifier & ContactUuidsQualifier)
  ) => {
    const contactUuidSet = new Set(qualifier.contactUuids);
    
    const fetchFn = async (
      limit: number,
      skip: number
    ) => {
      const result = await db
        .allDocs({ 
          include_docs: false,
          limit,
          skip,
          startkey: `target~${qualifier.reportingPeriod}~`,
          endkey: `target~${qualifier.reportingPeriod}~\ufff0`
        });
      
      return result.rows.map(({ id }) => id);
    };

    const filterFn = (uuid: Nullable<string>) => {
      if (!uuid) {
        return false;
      }
      const [,, contactUuid] = uuid.split('~');
      return !!contactUuid && contactUuidSet.has(contactUuid);
    };

    return fetchAndFilter(
      fetchFn,
      filterFn,
      limit
    )(limit, skip);
  };

  const fetchDocs = (limit: number, skip: number) => async (
    db: PouchDB.Database, 
    uuids: string[]
  ) => {
    const fetchFn = async (
      limit: number,
      skip: number
    ) => {
      const result = await db
        .allDocs({ include_docs: true, limit, skip, keys: uuids });

      if (result.rows.length === 0) {
        return [];
      }

      return result.rows
        .filter(row => row.doc)
        .map(row => row.doc as TargetInterval.v1.TargetInterval);
    };

    const filterFn = (doc: Nullable<Doc>, uuid?: string) => {
      if (!doc) {
        if (uuid) {
          logger.warn(`No target interval found for identifier [${uuid}].`);
        }
        return false;
      }
      return true;
    };

    return fetchAndFilter(
      fetchFn,
      filterFn,
      limit
    )(limit, skip);
  };
}
