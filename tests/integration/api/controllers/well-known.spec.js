const chai = require('chai');
const utils = require('@utils');

const unauthenticatedGetRequestOptions = {
  method: 'GET',
  noAuth: true
};

describe('well-known', () => {
  describe('GET /.well-known/assetlinks.json', () => {
    afterEach(() => utils.revertSettings(true));

    it('returns 404 if not configured', async () => {
      await utils.request({
        path: '/.well-known/assetlinks.json',
        ...unauthenticatedGetRequestOptions,
      })
        .then(() => chai.expect.fail('should have thrown'))
        .catch(error => {
          chai.expect(error.response.statusCode).to.equal(404);
        });
    });

    it('returns the file as json', async () => {
      const assetlinks = [{
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'org.medicmobile.webapp.mobile',
          package_name: 'org.medicmobile.webapp.mobile',
          sha256_cert_fingerprints:
            ['62:BF:C1:78:24:D8:4D:5C:B4:E1:8B:66:98:EA:14:16:57:6F:A4:E5:96:CD:93:81:B2:65:19:71:A7:80:EA:4D']
        }
      }];
      await utils.updateSettings({ assetlinks }, true);

      const response = await utils.request(Object.assign(
        { path: '/.well-known/assetlinks.json' },
        unauthenticatedGetRequestOptions,
      ));
      chai.expect(response).to.deep.equal(assetlinks);
    });
  });
});
