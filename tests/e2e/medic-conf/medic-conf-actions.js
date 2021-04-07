const _ = require('lodash');
const {expect} = require('chai');
const util = require('util');
const { API_PORT }=require('../constants');
const exec = util.promisify(require('child_process').exec);


const actions = ['compile-app-settings','backup-app-settings','convert-app-forms',
  'convert-collect-forms','convert-contact-forms', 'backup-all-forms','upload-app-forms','upload-collect-forms',
  'upload-contact-forms', 'upload-resources','upload-branding','upload-partners','upload-custom-translations',
  'upload-privacy-policies'];

describe('medic-conf supported actions', () => {
  beforeAll( () =>{
    // Change the directory
    try {
      process.chdir('config/default');
    } catch (err) {
      console.error('no need to change directory');
    }
  });

  afterAll(() =>{
    // Change the directory back to cht-core
    process.chdir('../..');
  });

  const runCommand = async (action) => {
    const { stdout, stderr } = await exec(`medic-conf --url=http://admin:pass@localhost:${API_PORT} ${action} --force`);
    if (stderr) {
      console.error(`error: ${stderr}`);
    }
    return stdout;
  };

  it('should execute  upload-app-settings', async () => {
    try {
      const result = await runCommand('upload-app-settings');
      expect(result).to.contain(`INFO Settings updated successfully`);
    } catch (error) {
      console.log(error.stdout);
    }
  });

  _.forEach(actions,  async (action)  =>{
    it(`should execute  ${action} `, async () => {
      try {
        const result = await runCommand(action);
        expect(result).to.contain(`INFO ${action} complete.`);
      } catch (error) {
        console.log(error.stdout);
      }
    });
  });
});
