import { getDocById, v1 as docV1 } from './libs/doc';
import { LocalEnvironment } from './libs/local-environment';
import { fetchIdentifiedResource } from './libs/remote-environment';
import contactTypeUtils from '@medic/contact-types-utils';

const validateIdentifier = (identifier: unknown): identifier is V1.UuidIdentifier => {
  if (docV1.isUuidIdentifier(identifier)) {
    return true;
  }
  throw new Error('Invalid identifier');
};

const isPerson = (settings: Doc, doc: Doc): doc is V1.Person => contactTypeUtils.isPerson(settings, doc);

export const v1 = {
  remote: {
    get: async (identifier: V1.UuidIdentifier): Promise<Nullable<V1.Person>> => {
      validateIdentifier(identifier);
      return fetchIdentifiedResource('api/v1/person', identifier.uuid);
    },
  },
  local: (localEnv: LocalEnvironment): V1.PersonSource => {
    return {
      get: async (identifier: V1.UuidIdentifier): Promise<Nullable<V1.Person>> => {
        validateIdentifier(identifier);
        const doc = await getDocById(localEnv.medicDb)(identifier.uuid);
        const settings = localEnv.getSettings();
        if (!doc || !isPerson(settings, doc)) {
          return null;
        }
        return doc;
      },
    };
  }
};
