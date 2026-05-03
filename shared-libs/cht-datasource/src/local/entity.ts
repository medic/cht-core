import { Doc } from '../libs/doc';
import { Nullable } from '../libs/core';
import { UuidQualifier } from '../qualifier';
import { getDocById } from './libs/doc';
import { LocalDataContext } from './libs/data-context';

/** @internal */
export namespace v1 {
  /** @internal */
  export const get = ({ medicDb }: LocalDataContext) => {
    const getMedicDocById = getDocById(medicDb);
    return async (identifier: UuidQualifier): Promise<Nullable<Doc>> => {
      return getMedicDocById(identifier.uuid);
    };
  };
}
