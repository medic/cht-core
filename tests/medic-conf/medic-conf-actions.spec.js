const {expect} = require('chai');
const util = require('util');
const { API_PORT, API_HOST } = require('../constants');
const {username, password} = require('../auth')();
const exec = util.promisify(require('child_process').exec);
const url = `http://${username}:${password}@${API_HOST}:${API_PORT}`;

const actions = ['compile-app-settings','backup-app-settings','convert-app-forms',
  'convert-collect-forms','convert-contact-forms', 'backup-all-forms','upload-app-forms','upload-collect-forms',
  'upload-contact-forms', 'upload-resources','upload-branding','upload-partners','upload-custom-translations',
  'upload-privacy-policies'];

describe('Medic-conf actions tests', () => {
  beforeAll(  () =>{
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
    const { stdout } = await exec(`medic-conf --url=${url} ${action} --force`, { cwd: 'config/default' });
    return stdout;
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
