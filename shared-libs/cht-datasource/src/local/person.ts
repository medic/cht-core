import { Doc } from '../libs/doc';
import contactTypeUtils from '@medic/contact-types-utils';
import { Nullable, Page } from '../libs/core';
import { ContactTypeQualifier, UuidQualifier, ContactQualifier } from '../qualifier';
import * as Person from '../person';
import { fetchAndFilter, getDocById, queryDocsByKey, createDoc, updateDoc } from './libs/doc';
import { LocalDataContext, SettingsService } from './libs/data-context';
import logger from '@medic/logger';
import { InvalidArgumentError, NotFoundError } from '../libs/error';
import { validateCursor } from './libs/core';
import { fetchHydratedDoc } from './libs/lineage';

/** @internal */
export namespace v1 {
  const isPerson = (settings: SettingsService) => (doc: Nullable<Doc>, uuid?: string): doc is Person.v1.Person => {
    if (!doc) {
      if (uuid) {
        logger.warn(`No person found for identifier [${uuid}].`);
      }
      return false;
    }
    const hasPersonType = contactTypeUtils.isPerson(settings.getAll(), doc);
    if (!hasPersonType) {
      logger.warn(`Document [${doc._id}] is not a valid person.`);
      return false;
    }
    return true;
  };

  /**
   * Converts reported_date to Unix timestamp in milliseconds.
   * @param reportedDate the reported date as string or number, or undefined
   * @returns Unix timestamp in milliseconds
   * @internal
   */
  const normalizeReportedDate = (reportedDate?: string | number): number => {
    if (reportedDate === undefined) {
      return Date.now();
    }
    if (typeof reportedDate === 'number') {
      return reportedDate;
    }
    const timestamp = new Date(reportedDate).getTime();
    if (isNaN(timestamp)) {
      throw new InvalidArgumentError(
        `Invalid reported_date [${reportedDate}]. Must be a valid date string or timestamp.`
      );
    }
    return timestamp;
  };

  /**
   * Hydrates a field (parent or contact) with lineage from a UUID string or object.
   * @param medicDb the PouchDB database
   * @param field the field value (UUID string or already hydrated object)
   * @param fieldName the name of the field for error messages
   * @returns hydrated object with lineage or undefined
   * @internal
   */
  const hydrateField = async (
    medicDb: PouchDB.Database<Doc>,
    field: string | Record<string, unknown> | undefined,
    fieldName: string
  ): Promise<Record<string, unknown> | undefined> => {
    if (!field) {
      return undefined;
    }

    // If already an object (hydrated), use as-is
    if (typeof field === 'object') {
      return field;
    }

    // If it's a string UUID, hydrate it
    if (typeof field === 'string') {
      const fetchHydratedMedicDoc = fetchHydratedDoc(medicDb);
      const hydratedDoc = await fetchHydratedMedicDoc(field);

      if (!hydratedDoc) {
        throw new InvalidArgumentError(`${fieldName} with UUID [${field}] not found.`);
      }

      // Extract only _id and parent lineage
      const minifyLineage = (doc: Record<string, unknown>): Record<string, unknown> => {
        const result: Record<string, unknown> = { _id: doc._id };
        if (doc.parent && typeof doc.parent === 'object') {
          result.parent = minifyLineage(doc.parent as Record<string, unknown>);
        }
        return result;
      };

      return minifyLineage(hydratedDoc);
    }

    throw new InvalidArgumentError(`${fieldName} must be a string UUID or object, received ${typeof field}.`);
  };

  /** @internal */
  export const get = ({ medicDb, settings }: LocalDataContext) => {
    const getMedicDocById = getDocById(medicDb);
    return async (identifier: UuidQualifier): Promise<Nullable<Person.v1.Person>> => {
      const doc = await getMedicDocById(identifier.uuid);
      if (!isPerson(settings)(doc, identifier.uuid)) {
        return null;
      }
      return doc;
    };
  };

  /** @internal */
  export const getWithLineage = ({ medicDb, settings }: LocalDataContext) => {
    const fetchHydratedMedicDoc = fetchHydratedDoc(medicDb);
    return async (identifier: UuidQualifier): Promise<Nullable<Person.v1.PersonWithLineage>> => {
      const person = await fetchHydratedMedicDoc(identifier.uuid);
      if (!isPerson(settings)(person, identifier.uuid)) {
        return null;
      }

      return person;
    };
  };

  /** @internal */
  export const getPage = ({ medicDb, settings }: LocalDataContext) => {
    const getDocsByPage = queryDocsByKey(medicDb, 'medic-client/contacts_by_type');

    return async (
      personType: ContactTypeQualifier,
      cursor: Nullable<string>,
      limit: number,
    ): Promise<Page<Person.v1.Person>> => {
      const personTypes = contactTypeUtils.getPersonTypes(settings.getAll());
      const personTypesIds = personTypes.map((item) => item.id);

      if (!personTypesIds.includes(personType.contactType)) {
        throw new InvalidArgumentError(`Invalid contact type [${personType.contactType}].`);
      }

      const skip = validateCursor(cursor);

      const getDocsByPageWithPersonType = (
        limit: number,
        skip: number
      ) => getDocsByPage([personType.contactType], limit, skip);

      return await fetchAndFilter(
        getDocsByPageWithPersonType,
        isPerson(settings),
        limit
      )(limit, skip) as Page<Person.v1.Person>;
    };
  };

  /** @internal */
  export const create = ({ medicDb, settings }: LocalDataContext) => {
    const createMedicDoc = createDoc(medicDb);
    const getMedicDocById = getDocById(medicDb);
    return async (qualifier: ContactQualifier): Promise<Person.v1.Person> => {
      const personTypes = contactTypeUtils.getPersonTypes(settings.getAll());
      const personTypesIds = personTypes.map((item) => item.id);

      if (!personTypesIds.includes(qualifier.type)) {
        throw new InvalidArgumentError(`Invalid person type [${qualifier.type}].`);
      }

      // Get the person type configuration to check parent requirements
      const personType = personTypes.find(p => p.id === qualifier.type);
      const requiresParent = Array.isArray(personType?.parents) && personType.parents.length > 0;
      const allowedParentTypes = (personType?.parents ?? []) as string[];

      // Validate parent requirement based on person type hierarchy
      if (requiresParent) {
        // Parent is required for this person type
        if (!qualifier.parent) {
          throw new InvalidArgumentError(
            `parent is required for person type [${qualifier.type}].`
          );
        }

        // Get parent UUID - handle both string UUID and hydrated object
        let parentUuid: string;
        if (typeof qualifier.parent === 'string') {
          // Parent is a UUID string
          parentUuid = qualifier.parent;
        } else if (typeof qualifier.parent === 'object') {
          // Parent is already hydrated, extract _id
          parentUuid = (qualifier.parent as Record<string, unknown>)._id as string;
        } else {
          throw new InvalidArgumentError(
            `parent must be a string UUID or object, received ${typeof qualifier.parent}.`
          );
        }

        // Fetch parent document from database to validate type
        const parentDoc = await getMedicDocById(parentUuid);
        if (!parentDoc) {
          throw new InvalidArgumentError(
            `Parent document [${parentUuid}] not found.`
          );
        }

        // Validate parent is of correct type
        const parentTypeId = contactTypeUtils.getTypeId(parentDoc);
        if (!parentTypeId) {
          throw new InvalidArgumentError(
            `Could not determine type for parent document [${parentUuid}].`
          );
        }
        if (!allowedParentTypes.includes(parentTypeId)) {
          throw new InvalidArgumentError(
            `Invalid parent type [${parentTypeId}] for person type [${qualifier.type}]. ` +
            `Allowed parent types: [${allowedParentTypes.join(', ')}].`
          );
        }
      } else if (qualifier.parent) {
        // Parent is not allowed for top-level person types
        throw new InvalidArgumentError(
          `parent is not allowed for person type [${qualifier.type}]. This is a top-level person type.`
        );
      }

      // Validate that _rev is not provided for create
      if ('_rev' in qualifier && qualifier._rev) {
        throw new InvalidArgumentError('_rev is not allowed for create operations.');
      }

      // Normalize reported_date to Unix timestamp
      const reported_date = normalizeReportedDate(qualifier.reported_date);

      // Hydrate parent with lineage if provided
      const parent = await hydrateField(
        medicDb,
        qualifier.parent as string | Record<string, unknown> | undefined,
        'Parent'
      );

      // Hydrate contact with lineage if provided
      const contact = await hydrateField(
        medicDb,
        qualifier.contact as string | Record<string, unknown> | undefined,
        'Contact'
      );

      const docToCreate = {
        ...qualifier,
        reported_date,
        ...(parent && { parent }),
        ...(contact && { contact }),
      };

      const createdDoc = await createMedicDoc(docToCreate as Omit<Doc, '_rev'>);

      if (!isPerson(settings)(createdDoc)) {
        throw new Error(`Created document [${createdDoc._id}] is not a valid person.`);
      }

      return createdDoc;
    };
  };

  /** @internal */
  export const update = ({ medicDb, settings }: LocalDataContext) => {
    const updateMedicDoc = updateDoc(medicDb);
    const getMedicDocById = getDocById(medicDb);
    return async (qualifier: ContactQualifier): Promise<Person.v1.Person> => {
      const personTypes = contactTypeUtils.getPersonTypes(settings.getAll());
      const personTypesIds = personTypes.map((item) => item.id);

      if (!personTypesIds.includes(qualifier.type)) {
        throw new InvalidArgumentError(`Invalid person type [${qualifier.type}].`);
      }

      // Get the person type configuration to check parent requirements
      const personType = personTypes.find(p => p.id === qualifier.type);
      const requiresParent = Array.isArray(personType?.parents) && personType.parents.length > 0;
      const allowedParentTypes = (personType?.parents ?? []) as string[];

      // Validate parent requirement based on person type hierarchy
      if (requiresParent) {
        // Parent is required for this person type
        if (!qualifier.parent) {
          throw new InvalidArgumentError(
            `parent is required for person type [${qualifier.type}].`
          );
        }

        // Get parent UUID - handle both string UUID and hydrated object
        let parentUuid: string;
        if (typeof qualifier.parent === 'string') {
          // Parent is a UUID string
          parentUuid = qualifier.parent;
        } else if (typeof qualifier.parent === 'object') {
          // Parent is already hydrated, extract _id
          parentUuid = (qualifier.parent as Record<string, unknown>)._id as string;
        } else {
          throw new InvalidArgumentError(
            `parent must be a string UUID or object, received ${typeof qualifier.parent}.`
          );
        }

        // Fetch parent document from database to validate type
        const parentDoc = await getMedicDocById(parentUuid);
        if (!parentDoc) {
          throw new InvalidArgumentError(
            `Parent document [${parentUuid}] not found.`
          );
        }

        // Validate parent is of correct type
        const parentTypeId = contactTypeUtils.getTypeId(parentDoc);
        if (!parentTypeId) {
          throw new InvalidArgumentError(
            `Could not determine type for parent document [${parentUuid}].`
          );
        }
        if (!allowedParentTypes.includes(parentTypeId)) {
          throw new InvalidArgumentError(
            `Invalid parent type [${parentTypeId}] for person type [${qualifier.type}]. ` +
            `Allowed parent types: [${allowedParentTypes.join(', ')}].`
          );
        }
      } else if (qualifier.parent) {
        // Parent is not allowed for top-level person types
        throw new InvalidArgumentError(
          `parent is not allowed for person type [${qualifier.type}]. This is a top-level person type.`
        );
      }

      // Validate that _id is provided for update
      if (!qualifier._id) {
        throw new InvalidArgumentError('_id is required for update operations.');
      }

      // Validate that _rev is provided for update
      if (!qualifier._rev) {
        throw new InvalidArgumentError('_rev is required for update operations.');
      }

      // Fetch existing document to validate immutable fields
      const existingDoc = await getMedicDocById(qualifier._id);
      if (!existingDoc) {
        throw new NotFoundError(`Document [${qualifier._id}] not found.`);
      }

      // Helper to extract UUID from either string or hydrated object
      const extractUuid = (field: string | Record<string, unknown> | undefined): string | undefined => {
        if (!field) {
          return undefined;
        }
        if (typeof field === 'string') {
          return field;
        }
        if (typeof field === 'object') {
          return field._id as string;
        }
        return undefined;
      };

      // Validate immutable fields haven't changed
      const immutableFields = [
        { name: 'type', current: existingDoc.type, incoming: qualifier.type },
        { name: 'reported_date', current: existingDoc.reported_date, incoming: qualifier.reported_date },
        {
          name: 'parent',
          current: extractUuid(existingDoc.parent as string | Record<string, unknown> | undefined),
          incoming: extractUuid(qualifier.parent as string | Record<string, unknown> | undefined)
        },
      ];

      for (const field of immutableFields) {
        if (field.incoming !== undefined && field.current !== field.incoming) {
          throw new InvalidArgumentError(
            `Field [${field.name}] is immutable and cannot be changed. ` +
            `Current value: [${field.current as string}], Attempted value: [${field.incoming as string}].`
          );
        }
      }

      // Hydrate parent with lineage if provided
      const parent = await hydrateField(
        medicDb,
        qualifier.parent as string | Record<string, unknown> | undefined,
        'Parent'
      );

      // Hydrate contact with lineage if provided
      const contact = await hydrateField(
        medicDb,
        qualifier.contact as string | Record<string, unknown> | undefined,
        'Contact'
      );

      const docToUpdate = {
        ...qualifier,
        _rev: qualifier._rev,
        ...(parent && { parent }),
        ...(contact && { contact }),
      } as Doc;

      const updatedDoc = await updateMedicDoc(docToUpdate);

      if (!isPerson(settings)(updatedDoc)) {
        throw new Error(`Updated document [${updatedDoc._id}] is not a valid person.`);
      }

      return updatedDoc;
    };
  };
}
