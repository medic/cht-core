import { Doc } from '../libs/doc';
import contactTypeUtils from '@medic/contact-types-utils';
import { Nullable } from '../libs/core';
import { UuidQualifier } from '../qualifier';
import * as Person from '../person';
import { getDocById } from './libs/doc';
import { LocalDataContext } from './libs/data-context';

export namespace V1 {
  /** @internal */
  const isPerson = (settings: Doc, doc: Doc): doc is Person.V1.Person => contactTypeUtils.isPerson(settings, doc);

  /** @internal */
  export const get = async (
    localContext: LocalDataContext,
    identifier: UuidQualifier
  ): Promise<Nullable<Person.V1.Person>> => {
    const { medicDb, settings } = localContext;
    const doc = await getDocById(medicDb)(identifier.uuid);
    if (!doc || !isPerson(settings.getAll(), doc)) {
      return null;
    }
    return doc;
  };
}
