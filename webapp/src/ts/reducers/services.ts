import { Actions } from '../actions/services';
import { createReducer, on } from '@ngrx/store';

const initialState = {
  lastChangedDoc: false
};

const _servicesReducer = createReducer(
  initialState,
  on(Actions.setLastChangedDoc, (state, { payload: { lastChangedDoc } }) => {
    return { ...state, lastChangedDoc };
  })
);

export const servicesReducer = (state, action) => {
  return _servicesReducer(state, action);
};

