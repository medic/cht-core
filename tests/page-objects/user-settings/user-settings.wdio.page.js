const configurationSection = () => $('.content .configuration');

module.exports = {

  openEditSettings: async () => {
    await (await configurationSection()).waitForDisplayed();
    const link = await (await configurationSection()).$$('.btn-link').last();
    await link.click();
    // modals have an animation and the click might land somewhere else
    await browser.pause(500);
  },
};
