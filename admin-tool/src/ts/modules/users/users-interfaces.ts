/**
 * Represents a user document returned by the /api/v2/users endpoint.
 */
export interface User {
  id?: string;
  username?: string;
  fullname?: string;
  phone?: string;
  facility_id?: string;
  contact_id?: string;
  inactive?: boolean;
  roles?: string[];
}

/**
 * Represents the validation error state for the Create User form.
 */
export interface CreateUserErrors {
  submit?: string;
  username?: string;
  email?: string;
  phone?: string;
  roles?: string;
  place?: string;
  contact?: string;
  password?: string;
  passwordConfirm?: string;
  replicationLimit?: string;
}
