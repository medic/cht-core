const logger = require('@medic/logger');
const secureSettings = require('@medic/settings');

// Vault key for the server's offline data bundle private key for one device. Built here, next to
// the code that clears these entries, because the api writes them and the exact joined string has
// to match on both sides. Server only: it has no business in a browser bundle.
const vaultKey = (username, deviceId) => `offline-data-bundle-server-key:${username}:${deviceId}`;

/**
 * Marks the user's registered devices as no longer trusted, and says which they were.
 *
 * A device key lets a phone produce signed bundles that are written as this user, and it does not
 * depend on the password. So a password change, which is what someone does when a phone is lost,
 * would otherwise lock the old phone out of ordinary sync while leaving it able to keep injecting
 * data through a relay.
 *
 * A device recovers by signing in again: the password change invalidates its session, the 401 sends
 * it back to the login page, and that is what clears its cached key material. A sync alone does not
 * do it, because registration short-circuits on a record that is still there.
 *
 * Set to `undefined` rather than deleted so the field is gone from whatever is written even if a
 * caller later assembles its doc by spreading, which cannot remove a key the source merely lacks.
 * Both forms vanish from the written JSON.
 *
 * Only the half that is part of the document write happens here. The server's own key for each
 * device is destroyed separately by `destroyServerKeys`, because that cannot be undone and must
 * not happen until the write it belongs to has succeeded.
 *
 * @param {Object} user - the user doc being updated, modified in place
 * @returns {String[]} the device ids whose server key is now owed a `destroyServerKeys`
 */
const clearDeviceKeys = (user) => {
  const deviceIds = Object.keys(user.keys_by_device || {});
  if (deviceIds.length) {
    user.keys_by_device = undefined;
  }
  return deviceIds;
};

/**
 * Destroys the server's private key for each of these devices.
 *
 * Irreversible, so it runs only once the user doc has actually been written. Until that point the
 * device is still listed as trusted and must stay able to send; losing the key first would leave
 * it permanently refused with nothing to tell it to register again.
 *
 * The vault has no delete, so the entry is overwritten, which destroys the stored key material.
 *
 * Never throws, and must not be changed to. By the time this runs the password has changed and the
 * doc no longer lists these devices, so they are refused on the signing key alone and this is
 * defence in depth. Throwing would report a failure for a change that has already landed, and on
 * an instance whose CouchDB secret is unset the vault rejects every time, so that would be every
 * password change. A vault entry left behind by a failure is inert: nothing can use it once the
 * doc no longer names the device, and no later password change retries it because there is then
 * nothing left to revoke.
 *
 * Deleting a user needs none of this: the `_users` doc goes with it, so the device can never be
 * resolved again and whatever is left in the vault is unreachable.
 *
 * @param {String} username
 * @param {String[]} deviceIds - as returned by `clearDeviceKeys`
 */
const destroyServerKeys = async (username, deviceIds) => {
  await Promise.all(deviceIds.map(async (deviceId) => {
    try {
      await secureSettings.setCredentials(vaultKey(username, deviceId), '');
    } catch (err) {
      logger.error(`Could not destroy the offline data bundle key for '${username}'/'${deviceId}': %o`, err);
    }
  }));
};

module.exports = {
  vaultKey,
  clearDeviceKeys,
  destroyServerKeys,
};
