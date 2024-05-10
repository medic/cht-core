import { getDocById } from '../libs/doc';
import { LocalEnvironment } from './libs/local-environment';
import contactTypeUtils from '@medic/contact-types-utils';
import { validateIdentifier } from '../libs/person';

const isPerson = (settings: Doc, doc: Doc): doc is V1.Person => contactTypeUtils.isPerson(settings, doc);

export const v1 = (localEnv: LocalEnvironment): V1.PersonSource => {
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
};
