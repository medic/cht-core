import { Contact } from './libs/contact';
import { Doc, getDocById, V1 as DocV1 } from './libs/doc';
import { Nullable } from './libs/core';
import { LocalEnvironment } from './libs/local-environment';
import { fetchIdentifiedResource } from './libs/remote-environment';
import contactTypeUtils from '@medic/contact-types-utils';

const validateIdentifier = (identifier: unknown): identifier is DocV1.UuidIdentifier => {
  if (DocV1.isUuidIdentifier(identifier)) {
    return true;
  }
  throw new Error('Invalid identifier');
};

export namespace V1 {

  interface AbstractPerson {
    date_of_birth?: Date;
    phone?: string;
    patient_id?: string;
    sex?: string;
  }

  const isPerson = (settings: Doc, doc: Doc): doc is Person => contactTypeUtils.isPerson(settings, doc);

  export interface PersonFactory {
    /**
     * Returns the identified person.
     * @param identifier the unique identifier of the person
     * @returns The identified person or <code>null</code> if not found
     */
    get: (identifier: DocV1.UuidIdentifier) => Promise<Nullable<Person>>;
  }

  export interface Person extends Contact, AbstractPerson { }

  export const remote: PersonFactory = {
    get: async (identifier: DocV1.UuidIdentifier): Promise<Nullable<Person>> => {
      validateIdentifier(identifier);
      return fetchIdentifiedResource('api/v1/person', identifier.uuid);
    },
  };

  export const local = (localEnv: LocalEnvironment): PersonFactory => {
    return {
      get: async (identifier: DocV1.UuidIdentifier): Promise<Nullable<Person>> => {
        validateIdentifier(identifier);
        const doc = await getDocById(localEnv.medicDb)(identifier.uuid);
        const settings = localEnv.getSettings();
        if (!doc || !isPerson(settings, doc)) {
          return null;
        }
        return doc;
      },
    };
  };
}
