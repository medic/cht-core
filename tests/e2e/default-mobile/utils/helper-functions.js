const utils = require('@utils');
const commonPage = require('@page-objects/default/common/common.wdio.page');

const updateSettings = async (user) => {
  const settings = await utils.getSettings();
  const permissions = settings.permissions;
  permissions.can_view_message_action = user.roles;
  
  await utils.updateSettings({ permissions }, false);
  await commonPage.closeReloadModal();
  await commonPage.goToBase();
};

module.exports = {
  updateSettings,
};
