import { Doc, isDoc } from '../libs/doc';
import contactTypeUtils from '@medic/contact-types-utils';
import { assertHasRequiredField, DataObject, Nullable, Page } from '../libs/core';
import * as Qualifier from '../qualifier';
import { ContactTypeQualifier, UuidQualifier } from '../qualifier';
import * as Person from '../person';
import { createDoc, fetchAndFilter, getDocById, queryDocsByKey, updateDoc } from './libs/doc';
import { LocalDataContext, SettingsService } from './libs/data-context';
import logger from '@medic/logger';
import { InvalidArgumentError, ResourceNotFoundError } from '../libs/error';
import { assertFieldsUnchanged, getReportedDateTimestamp, validateCursor } from './libs/core';
import * as Input from '../input';
import { assertHasValidParentType, assertSameParentLineage, fetchHydratedDoc, minifyDoc } from './libs/lineage';
import { assertPersonInput } from '../libs/parameter-validators';

const DEFAULT_PERSON_TYPE = {
  id: 'person',
  parents: [
    'district_hospital',
    'health_center',
    'clinic',
  ]
};

const getTypeProperties = (settings: DataObject, input: Input.v1.PersonInput) => {
  const customType = contactTypeUtils.getTypeById(settings, input.type);
  if (!contactTypeUtils.isPersonType(customType ?? { id: input.type })) {
    throw new InvalidArgumentError(`[${input.type}] is not a valid person type.`);
  }
  return customType
    ? { contact_type: input.type, type: 'contact' }
    : { type: input.type };
};

// eslint-disable-next-line func-style
function assertParent(
  settings: DataObject,
  input: Input.v1.PersonInput,
  parent: Nullable<Doc>
): asserts parent is Doc {
  if (!parent) {
    throw new InvalidArgumentError(`Parent contact [${input.parent}] not found.`);
  }
  const childType = contactTypeUtils.getTypeById(settings, input.type) ?? DEFAULT_PERSON_TYPE;
  assertHasValidParentType(childType, parent);
}

/** @internal */
export namespace v1 {
  /** @internal */
  export const isPerson = (
    settings: SettingsService,
    doc: Nullable<Doc>,
  ): doc is Person.v1.Person => {
    if (!isDoc(doc)) {
      return false;
    }
    return contactTypeUtils.isPerson(settings.getAll(), doc);
  };

  /** @internal */
  export const get = ({ medicDb, settings }: LocalDataContext) => {
    const getMedicDocById = getDocById(medicDb);
    return async (identifier: UuidQualifier): Promise<Nullable<Person.v1.Person>> => {
      const doc = await getMedicDocById(identifier.uuid);
      if (!isPerson(settings, doc)) {
        logger.warn(`Document [${identifier.uuid}] is not a valid person.`);
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
      if (!isPerson(settings, person)) {
        logger.warn(`Document [${identifier.uuid}] is not a valid person.`);
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
        (doc: Nullable<Doc>) => isPerson(settings, doc),
        limit
      )(limit, skip) as Page<Person.v1.Person>;
    };
  };

  /** @internal */
  export const create = ({
    medicDb,
    settings
  }: LocalDataContext) => {
    const createMedicDoc = createDoc(medicDb);
    const getMedicDoc = getDocById(medicDb);
    const minifyLineage = minifyDoc(medicDb);

    return async (input: Input.v1.PersonInput): Promise<Person.v1.Person> => {
      assertPersonInput(input);
      const settingsData = settings.getAll();
      const typeProperties = getTypeProperties(settingsData, input);
      const parent = await getMedicDoc(input.parent);
      assertParent(settingsData, input, parent);
      const personDoc = minifyLineage({
        ...input,
        ...typeProperties,
        parent,
        reported_date: getReportedDateTimestamp(input.reported_date),
      });
      return createMedicDoc(personDoc) as Promise<Person.v1.Person>;
    };
  };

  /** @internal*/
  export const update = (dataContext: LocalDataContext) => {
    const { medicDb, settings } = dataContext;
    const updateMedicDoc = updateDoc(medicDb);
    const getPerson = get(dataContext);
    const minifyLineage = minifyDoc(medicDb);

    return async <T extends Input.v1.UpdatePersonInput>(updatedPerson: T): Promise<T> => {
      if (!isPerson(settings, updatedPerson)) {
        throw new InvalidArgumentError('Valid _id, _rev, and type fields must be provided.');
      }
      const originalPerson = await getPerson(Qualifier.byUuid(updatedPerson._id));
      if (!originalPerson) {
        throw new ResourceNotFoundError(`Person record [${updatedPerson._id}] not found.`);
      }

      assertFieldsUnchanged(originalPerson, updatedPerson, ['_rev', 'reported_date', 'type', 'contact_type']);
      if (originalPerson.name) {
        assertHasRequiredField(updatedPerson, { name: 'name', type: 'string' }, InvalidArgumentError);
      }
      assertSameParentLineage(originalPerson, updatedPerson);
      const _rev = await updateMedicDoc(minifyLineage(updatedPerson));
      return { ...updatedPerson, _rev };
    };
  };
}
