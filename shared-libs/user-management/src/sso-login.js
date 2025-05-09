const config = require('./libs/config');
const db = require('./libs/db');
const passwords = require('./libs/passwords');
const { OIDC_ROLE } = require('./roles');

const isSsoLoginEnabled = () => !!config.get('oidc_provider');

const setOidcRole = (user) => {
  if (!user.roles) {
    user.roles = [];
  }
  if (!user.roles.includes(OIDC_ROLE)) {
    user.roles.push(OIDC_ROLE);
  }
};
const removeOidcRole = (user) => {
  if (!user.roles) {
    return;
  }
  user.roles = user.roles.filter(role => role !== OIDC_ROLE);
};

const getUsersByOidcUsername = async (oidcUsername) => db.users
  .query('users/users_by_field', { include_docs: true, key: ['oidc_username', oidcUsername] })
  .then(({ rows }) => rows.map(({ doc }) => doc));

const getUserIdWithDuplicateOidcUsername = async (oidcUsername, userDocId) => {
  const duplicates = await getUsersByOidcUsername(oidcUsername);
  return duplicates
    .map(({ _id }) => _id)
    .filter(id => id !== userDocId)[0];
};

const validateSsoLogin = async (data) => {
  if (!data.oidc_username){
    removeOidcRole(data);
    return;
  }
  if (data.password || data.token_login){
    return { msg: 'Cannot set password or token_login with oidc_username.' };
  }
  if (!isSsoLoginEnabled()){
    return { msg: 'Cannot set oidc_username when OIDC Login is not enabled.' };
  }

  const duplicateUserId = await getUserIdWithDuplicateOidcUsername(data.oidc_username, data._id);
  if (duplicateUserId) {
    return { msg: `The oidc_username [${data.oidc_username}] already exists for user [${duplicateUserId}].` };
  }

  data.password = passwords.generate();
  data.password_change_required = false;
  setOidcRole(data);
};

const validateSsoLoginUpdate = async (data, updatedUser, updatedUserSettings) => {
  const authFieldUpdated = !!['oidc_username', 'password', 'token_login'].find(key => Object.keys(data).includes(key));
  if (!authFieldUpdated) {
    return;
  }
  // token_login is set on updateUser later, so check data here
  if (updatedUser.oidc_username && data.token_login) {
    return { msg: 'Cannot set token_login with oidc_username.' };
  }

  const invalid = await validateSsoLogin(updatedUser);
  if (invalid) {
    return invalid;
  }
  if (updatedUser.roles) {
    updatedUserSettings.roles = [...updatedUser.roles];
  }
};

module.exports = {
  isSsoLoginEnabled,
  getUsersByOidcUsername,
  validateSsoLogin,
  validateSsoLoginUpdate
};
