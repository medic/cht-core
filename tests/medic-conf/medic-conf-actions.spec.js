const {expect} = require('chai');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const url = require('../utils').getInstanceUrl();

//Not all actions tested here due to missing forms and config
//[convert-collect-forms , upload-collect-form, upload-branding, upload-partners, upload-privacy-policies]
const actions = ['compile-app-settings','backup-app-settings','convert-app-forms','convert-contact-forms',
  'backup-all-forms','upload-app-forms','upload-contact-forms', 'upload-resources','upload-custom-translations'];

describe('cht-conf actions tests', () => {
  const runCommand = async (action) => {

    try {
      const { stdout, stderr }  = await exec(`cht-conf --url=${url} ${action} --force`, { cwd: 'config/default' });
      console.log('stderr');
      console.log(stderr);
      console.log('stderr end');
      return stdout;
    } catch (err) {
      console.log('catch err');
      console.log(err);
      console.log('catch err end');
      return err.stdout;
    } 
  };

  it('should execute  upload-app-settings', async () => {
    const result = await runCommand('upload-app-settings');
    expect(result).to.contain(`INFO Settings updated successfully`);
  });

  for(const action of actions) {
    it(`should execute ${action}`, async () => {
      const result = await runCommand(action);
      expect(result).to.contain(`INFO ${action} complete.`);
    });
  }
});
