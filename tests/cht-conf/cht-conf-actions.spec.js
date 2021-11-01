const { expect } = require('chai');

const { runCommand } = require('../cht-conf-utils');

//Not all actions tested here due to missing forms and config
//[convert-collect-forms , upload-collect-form, upload-branding, upload-partners, upload-privacy-policies]
const actions = [
  'compile-app-settings',
  'backup-app-settings',
  'convert-app-forms',
  'convert-contact-forms',
  'backup-all-forms',
  'upload-app-forms',
  'upload-contact-forms',
  'upload-resources',
  'upload-custom-translations',
];
const configPath = 'config/default';

describe('cht-conf actions tests', () => {
  it('should execute  upload-app-settings', async () => {
    const result = await runCommand('upload-app-settings', configPath);
    expect(result).to.contain(`INFO Settings updated successfully`);
  });

  for (const action of actions) {
    it(`should execute ${action}`, async () => {
      const result = await runCommand(action, configPath);
      expect(result).to.contain(`INFO ${action} complete.`);
    });
  }
});
