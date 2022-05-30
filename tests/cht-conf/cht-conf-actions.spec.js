const { expect } = require('chai');

const { runCommand } = require('../cht-conf-utils');
const utils = require('../utils');

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
  'convert-collect-forms', 'upload-collect-form', 'upload-branding', 'upload-partners', 'upload-privacy-policies'
];
const configPath = 'config/default';

describe('cht-conf actions tests', () => {
  before(async () => {
    const settings = await utils.getDoc('settings');
    expect(settings._rev.startsWith('1-')).to.be.true;
    expect(settings.settings.roles).to.not.include.any.keys('program_officer', 'chw_supervisor', 'chw');
  });

  after(async () => await utils.revertSettings(true));
  
  it('should execute  upload-app-settings', async () => {
    const result = await runCommand('upload-app-settings', configPath);
    expect(result).to.contain(`INFO Settings updated successfully`);
    const settings = await utils.getDoc('settings');
    expect(settings._rev.startsWith('2-')).to.be.true;
    expect(settings.settings.roles).to.include.all.keys('program_officer', 'chw_supervisor', 'chw');
  });

  // for (const action of actions) {
  //   it(`should execute ${action}`, async () => {
  //     const result = await runCommand(action, configPath);
  //     expect(result).to.contain(`INFO ${action} complete.`);
  //   });
  // }
// before gets settings
  //compile settings
  //upload-settings
  //upload contact forms
  //upload app forms
  //upload resources
  //upload-branding
  //upload-partners
  //upload-privacy-policies
  //upload-collect-form
});
