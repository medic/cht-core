import { getResource, RemoteDataContext } from './libs/data-context';
import { UuidQualifier } from '../qualifier';
import { Nullable } from '../libs/core';
import * as TargetInterval from '../target-interval';

/** @internal */
export namespace v1 {

  /** @internal */
  export const get = (remoteContext: RemoteDataContext) => {
    const getTargetInterval = getResource(remoteContext, 'api/v1/target-interval');
    return (
      identifier: UuidQualifier
    ): Promise<Nullable<TargetInterval.v1.TargetInterval>> => getTargetInterval(identifier.uuid);
  };
}
