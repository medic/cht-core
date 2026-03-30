/**
 * Tracks the state of the save operation.
 * Controls visibility of the loader, success, and error messages in the template.
 */
export interface ResponseStatus {
  state?: 'loading' | 'success' | 'error' | '';
  msg?: string;
}
