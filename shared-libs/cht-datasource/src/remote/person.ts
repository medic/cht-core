import { fetchIdentifiedResource } from './libs/remote-environment';
import { validateIdentifier } from '../libs/person';
import PersonSource = V1.PersonSource;

export const v1: PersonSource = {
  get: async (identifier: V1.UuidIdentifier): Promise<Nullable<V1.Person>> => {
    validateIdentifier(identifier);
    return fetchIdentifiedResource('api/v1/person', identifier.uuid);
  }
};
