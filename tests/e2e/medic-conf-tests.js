const _ = require('lodash');
const {expect} = require('chai');
const util = require('util');
const { API_PORT }=require('../constants');
const exec = util.promisify(require('child_process').exec);

const actions = ['compile-app-settings','backup-app-settings','upload-app-settings','convert-app-forms',
  'convert-collect-forms','convert-contact-forms', 'backup-all-forms','upload-app-forms','upload-collect-forms',
  'upload-contact-forms', 'upload-resources','upload-branding','upload-partners','upload-custom-translations',
  'upload-privacy-policies', 'delete-all-forms'];

describe('medic-conf supported actions', () => {
  beforeAll( () =>{
    // Change the directory
    console.log('working directory end: ' + process.cwd());
    try {
      process.chdir('config/default');
      console.log('working directory test: ' + process.cwd());
    } catch (err) {
      // Printing error if occurs
      console.error('no need to change directory');
    }
  });

  afterAll(() =>{
    // Change the directory back to cht-core
    process.chdir('../..');
    console.log('working directory end: ' + process.cwd());
  });

  const runCommand = async (action) => {
    const { stdout, stderr } = await exec(`medic-conf --url=http://admin:pass@localhost:${API_PORT} ${action} --force`);
    if (stderr) {
      console.error(`error: ${stderr}`);
    }
    return stdout;
  };
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
