const logger = require('@medic/logger');
const secureSettings = require('@medic/settings');
const { PREFIXES } = require('@medic/constants');

const deleteServerKey = async (username, deviceId) => {
  try {
    await secureSettings.deleteCredentials(`${PREFIXES.OFFLINE_DATA_BUNDLE_SERVER_KEY}${username}:${deviceId}`);
  } catch (err) {
    logger.error(`Could not delete the offline data bundle key for '${username}'/'${deviceId}': %o`, err);
  }
};

/**
 * Stops trusting every device the user registered.
 *
 * A device key lets a phone produce signed bundles that are written as this user, and it does not
 * depend on the password. So a password change, which is what someone does when a phone is lost,
 * would otherwise lock the old phone out of ordinary sync while leaving it able to keep injecting
 * data through a relay.
 *
 * Both halves go: the device's public key from the user doc, and the server's private key for that
 * device from the vault. Either one missing is enough for a bundle to be refused.
 *
 * Set to `undefined` rather than deleted so the field is gone from whatever is written even if a
 * caller later assembles its doc by spreading, which cannot remove a key the source merely lacks.
 *
 * Never throws for the vault: the user doc no longer naming the device is already enough to
 * refuse its bundles.
 *
 * @param {Object} user - the user doc about to be written, modified in place
 */
const clearDeviceKeys = async (user) => {
  const deviceIds = Object.keys(user.keys_by_device || {});
  if (!deviceIds.length) {
    return;
  }
  user.keys_by_device = undefined;
  await Promise.all(deviceIds.map(deviceId => deleteServerKey(user.name, deviceId)));
};

module.exports = {
  clearDeviceKeys,
};
