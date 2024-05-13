import { Doc, getDocById } from '../libs/doc';
import contactTypeUtils from '@medic/contact-types-utils';
import { Nullable } from '../libs/core';
import { UuidQualifier } from '../qualifier';
import * as Person from '../person';
import { LocalDataContext } from '../libs/context';

export namespace V1 {
  const isPerson = (settings: Doc, doc: Doc): doc is Person.V1.Person => contactTypeUtils.isPerson(settings, doc);

  export const get = async (
    localContext: LocalDataContext,
    identifier: UuidQualifier
  ): Promise<Nullable<Person.V1.Person>> => {
    const { medicDb, settings } = localContext;
    const doc = await getDocById(medicDb)(identifier.uuid);
    if (!doc || !isPerson(settings, doc)) {
      return null;
    }
    return doc;
  }
}
