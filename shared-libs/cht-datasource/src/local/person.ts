import { Doc, isDoc } from '../libs/doc';
import contactTypeUtils, { getContactTypes } from '@medic/contact-types-utils';
import { hasField, isNonEmptyArray, Nullable, Page } from '../libs/core';
import { ContactTypeQualifier, UuidQualifier } from '../qualifier';
import * as Person from '../person';
import { createDoc, fetchAndFilter, getDocById, queryDocsByKey, updateDoc } from './libs/doc';
import { LocalDataContext, SettingsService } from './libs/data-context';
import logger from '@medic/logger';
import {
  getContactLineage,
  getLineageDocsById,
} from './libs/lineage';
import { InvalidArgumentError } from '../libs/error';
import { addParentToInput, getUpdatedFields, validateCursor } from './libs/core';
import { PersonInput } from '../input';

/** @internal */
export namespace v1 {
  /** @internal */
  export const isPerson = (
    settings: SettingsService
  ) => (
    doc: Nullable<Doc>,
    uuid?: string
  ): doc is Person.v1.Person => {
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
    const getLineageDocs = getLineageDocsById(medicDb);
    const getLineage = getContactLineage(medicDb);

    return async (identifier: UuidQualifier): Promise<Nullable<Person.v1.PersonWithLineage>> => {
      const [person, ...lineagePlaces] = await getLineageDocs(identifier.uuid);
      if (!isPerson(settings)(person, identifier.uuid)) {
        return null;
      }
      // Intentionally not further validating lineage. For passivity, lineage problems should not block retrieval.
      if (!isNonEmptyArray(lineagePlaces)) {
        logger.debug(`No lineage places found for person [${identifier.uuid}].`);
        return person;
      }

      return await getLineage(lineagePlaces, person) as Nullable<Person.v1.PersonWithLineage>;
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
  export const createPerson = ({
    medicDb,
    settings
  } : LocalDataContext) => {
    const createPersonDoc = createDoc(medicDb);
    const getPersonDoc = getDocById(medicDb);
    const ensureHasValidParentFieldAndReturnParentDoc = async(
      input:Record<string, unknown>, 
      contactTypeObject: Record<string, unknown>
    ): Promise<Nullable<Doc>> => {
      const parentDoc = await getPersonDoc(input.parent as string);
      if (parentDoc === null){
        throw new InvalidArgumentError(
          `Parent with _id ${input.parent as string} does not exist.` //NoSONAR
        );
      }
      // Check whether parent doc's `contact_type` or `type`(if `contact_type` is absent) 
      // matches with any of the allowed parents type.
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      const typeToMatch = (parentDoc as PersonInput).contact_type || (parentDoc as PersonInput).type;
      const parentTypeMatchWithAllowedParents = (contactTypeObject.parents as string[])
        .find(parent => parent===typeToMatch);
        
      if (!(parentTypeMatchWithAllowedParents)) {
        throw new InvalidArgumentError(
          `Invalid parent type for [${JSON.stringify(input)}].`
        );
      }
      return parentDoc;
      
    };

    const validatePersonParent = async(
      contactTypeObject: Record<string, unknown>,
      input:Record<string, unknown>
    ): Promise<Doc|null> => {
      if (!hasField(contactTypeObject, {name: 'parents', type: 'object'})) {
        throw new InvalidArgumentError(
          `Invalid type of person, cannot have parent for [${JSON.stringify(input)}].`
        );
      } else {
        return await ensureHasValidParentFieldAndReturnParentDoc(input, contactTypeObject);
      }
    };

    const appendParent = async(
      typeFoundInSettingsContactTypes:Record<string, unknown> | undefined,
      input: PersonInput
    ) => {
      let parentDoc: Nullable<Doc> = null;
      if (typeFoundInSettingsContactTypes){
        parentDoc = await validatePersonParent(typeFoundInSettingsContactTypes, input);
      } else if (input.parent){
        parentDoc = await getPersonDoc(input.parent);
      }
    
      if (parentDoc === null){
        throw new InvalidArgumentError(
          `Parent with _id ${input.parent} does not exist.`
        );
      }
      input = addParentToInput(input, parentDoc, 'parent');
      return input;
    };

    return async (input: PersonInput) :Promise<Person.v1.Person> => {
      if (hasField(input, { name: '_rev', type: 'string', ensureTruthyValue: true })) {
        throw new InvalidArgumentError('Cannot pass `_rev` when creating a person.');
      }
    
      // This check can only be done when we have the contact_types from LocalDataContext.
      const allowedContactTypes = getContactTypes(settings.getAll());
      const typeFoundInSettingsContactTypes = allowedContactTypes.find(type => type.id === input.type);
      const typeIsHardCodedPersonType = input.type === 'person';
      if (!typeFoundInSettingsContactTypes && !typeIsHardCodedPersonType) {
        throw new InvalidArgumentError('Invalid person type.');
      }

      // Append `contact_type` for newer versions.
      if (typeFoundInSettingsContactTypes){
        input={
          ...input,
          contact_type: input.type,
          type: 'contact'
        } as unknown as PersonInput;
      }

      input = await appendParent(typeFoundInSettingsContactTypes, input);
      return await createPersonDoc(input) as Person.v1.Person;
    };
  };

  /** @internal*/
  export const updatePerson = ({
    medicDb,
    settings
  }:LocalDataContext) => {
    const updatePerson = updateDoc(medicDb);
    const getPerson = get({medicDb, settings} as LocalDataContext);
    return async(personInput: PersonInput):Promise<Nullable<Doc>> => {
      if (!isDoc(personInput)){
        throw new InvalidArgumentError(`Document for update is not a valid Doc ${JSON.stringify(personInput)}`);
      }
      const originalDoc = await getPerson({uuid: personInput._id});
      if (originalDoc===null){
        throw new InvalidArgumentError(`Person not found`);
      }
      const originalDocDeepCopy = JSON.parse(JSON.stringify(originalDoc)) as unknown as Person.v1.Person;
      const ignoredFields = new Set(['_id', '_rev', 'parent', 'reported_date']);
      const updatedFields = getUpdatedFields(originalDocDeepCopy, personInput, ignoredFields);
      const updatedDoc = {
        ...originalDocDeepCopy, ...updatedFields
      };
      return await updatePerson(updatedDoc);
    };
  };
}

