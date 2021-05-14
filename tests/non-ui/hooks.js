const conf = require('../../tests/conf');
const request = require('request-promise-native');
exports.mochaHooks = {
  // beforeAll:  ()=> {
  //   console.log('resetting the database...');
  //    conf.prepServices;

  //    console.log('Test started...');
  // },

  // afterAll: async () => {
  //   await request.post('http://localhost:31337/die');
  // }

	beforeAll: async ()=> {
    console.log('resetting the database...');
    //await utils.refreshDatabase();
		await console.log('Test started...');
	},

	afterAll(done) {
		console.log('Test done. Logging out...');
    
    done();
	},
};
