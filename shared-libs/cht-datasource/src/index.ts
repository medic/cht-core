/**
 * CHT Script API - Index
 * Builds and exports a versioned API from feature modules.
 * Whenever possible keep this file clean by defining new features in modules.
 */
import { hasPermissions, hasAnyPermission } from './auth';

const index = {
  v1: {
    hasPermissions,
    hasAnyPermission
  }
};
module.exports = index;
export default index;
