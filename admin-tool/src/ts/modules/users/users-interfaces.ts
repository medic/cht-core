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
