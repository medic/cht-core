import { createAction } from '@ngrx/store';

export const createSingleValueAction = (type, valueName:string) => {
  return createAction(
    type,
    (value:any) => ({ payload: { [valueName]: value } }),
  );
};

export const createMultiValueAction = (type) => {
  return createAction(
    type,
    (payload:any) => ({ payload: payload }),
  );
};
