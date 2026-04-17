/**
 * Represents a user document returned by the /api/v2/users endpoint.
 */
export interface User {
  id?: string;
  username?: string;
  fullname?: string;
  email?: string;
  phone?: string;
  facility_id?: string | string[];
  contact_id?: string;
  inactive?: boolean;
  roles?: string[];
  token_login?: {
    active: boolean;
    expiration_date: number;
    login_date?: number;
  };
}

/**
 * Validation errors for the Create User form.
 */
export interface CreateUserErrors {
  username?: string;
  fullname?: string;
  email?: string;
  phone?: string;
  roles?: string;
  place?: string;
  contact?: string;
  password?: string;
  passwordConfirm?: string;
  submit?: string;
  replicationLimit?: string;
}
