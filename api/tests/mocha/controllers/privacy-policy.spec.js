const chai = require('chai');
const sinon = require('sinon');
const _ = require('lodash');
const config = require('../../../src/config');
const serverUtils = require('../../../src/server-utils');
const privacyPolicyController = require('../../../src/controllers/privacy-policy');
const privacyPolicyService = require('../../../src/services/privacy-policy');
const cookieService = require('../../../src/services/cookie');
const templateService = require('../../../src/services/template');
const db = require('../../../src/db');

describe('Privacy Policy Controller', () => {
  
  let req;
  let res;

  beforeEach(() => {
    templateService.clear();
    req = {
      query: { },
      headers: { }
    };
    res = { send: sinon.stub() };
    sinon.stub(privacyPolicyService, 'get');
    sinon.stub(serverUtils, 'error');
    sinon.stub(config, 'translate');
    sinon.stub(cookieService, 'get');
    sinon.stub(templateService, 'getTemplate');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('get', () => {

    it('should throw an error when service rejects', () => {
      privacyPolicyService.get.rejects({ some: 'err' });

      return privacyPolicyController
        .get(req, res)
        .then(() => {
          chai.expect(serverUtils.error.callCount).to.equal(1);
          chai.expect(serverUtils.error.args[0]).to.deep.equal([{ some: 'err' }, req, res]);
        });
    });

    it('sends html response', () => {
      privacyPolicyService.get.resolves('my-template');
      templateService.getTemplate.returns(_.template('<html>{{policy}}</html>'));

      return privacyPolicyController
        .get(req, res)
        .then(() => {
          chai.expect(templateService.getTemplate.callCount).to.equal(1);
          chai.expect(res.send.callCount).to.equal(1);
          chai.expect(res.send.args[0][0]).to.equal('<html>my-template</html>');
        });
    });

    it('uses cookie locale', () => {
      privacyPolicyService.get.resolves('my-template');
      cookieService.get.returns('fr');
      templateService.getTemplate.returns(_.template('<html>{{policy}}</html>'));

      return privacyPolicyController
        .get(req, res)
        .then(() => {
          chai.expect(privacyPolicyService.get.callCount).to.equal(1);
          chai.expect(privacyPolicyService.get.args[0][0]).to.equal('fr');
          chai.expect(res.send.callCount).to.equal(1);
          chai.expect(config.translate.callCount).to.equal(3);
          chai.expect(config.translate.args[0][1]).to.equal('fr');
          chai.expect(config.translate.args[1][1]).to.equal('fr');
          chai.expect(config.translate.args[2][1]).to.equal('fr');
        });
    });

    it('uses query language without a locale cookie', async () => {
      req.query.lang = 'en';
      privacyPolicyService.get.resolves('my-template');
      templateService.getTemplate.returns(_.template('<html>{{policy}}</html>'));

      await privacyPolicyController.get(req, res);

      chai.expect(privacyPolicyService.get).to.have.been.calledOnceWithExactly('en');
      chai.expect(config.translate).to.have.been.calledWithExactly('Back', 'en');
      chai.expect(config.translate).to.have.been.calledWithExactly('login', 'en');
      chai.expect(config.translate).to.have.been.calledWithExactly('privacy.policy', 'en');
    });

    it('uses query language instead of cookie locale', async () => {
      req.query.lang = 'en';
      cookieService.get.returns('fr');
      privacyPolicyService.get.resolves('my-template');
      templateService.getTemplate.returns(_.template('<html>{{policy}}</html>'));

      await privacyPolicyController.get(req, res);

      chai.expect(privacyPolicyService.get).to.have.been.calledOnceWithExactly('en');
      chai.expect(config.translate).to.have.been.calledWithExactly('Back', 'en');
      chai.expect(config.translate).to.have.been.calledWithExactly('login', 'en');
      chai.expect(config.translate).to.have.been.calledWithExactly('privacy.policy', 'en');
    });

    it('renders the queried policy and controls instead of the cookie or default language', async () => {
      privacyPolicyService.get.restore();
      templateService.getTemplate.restore();
      req.query.lang = 'en';
      cookieService.get.returns('fr');
      sinon.stub(config, 'get').withArgs('locale').returns('ne');
      config.translate.callsFake((key, locale) => `${locale} ${key}`);
      sinon.stub(db.medic, 'get').resolves({
        privacy_policies: { en: 'english.html', fr: 'french.html', ne: 'nepali.html' },
        _attachments: {
          'english.html': { data: Buffer.from('<p>English policy</p>').toString('base64') },
          'french.html': { data: Buffer.from('<p>French policy</p>').toString('base64') },
          'nepali.html': { data: Buffer.from('<p>Nepali policy</p>').toString('base64') }
        }
      });

      await privacyPolicyController.get(req, res);

      chai.expect(serverUtils.error).not.to.have.been.called;
      chai.expect(res.send).to.have.been.calledOnce;
      const html = res.send.firstCall.args[0];
      chai.expect(html).to.include('<p>English policy</p>');
      chai.expect(html).not.to.include('French policy');
      chai.expect(html).not.to.include('Nepali policy');
      chai.expect(html).to.include('<h1>en privacy.policy</h1>');
      chai.expect(html).to.include('>en login</a>');
    });

    [
      { description: 'empty', lang: '' },
      { description: 'repeated', lang: ['en', 'ne'] },
      { description: 'object', lang: { locale: 'en' } }
    ].forEach(({ description, lang }) => {
      it(`uses cookie locale for ${description} query language`, async () => {
        req.query.lang = lang;
        cookieService.get.returns('fr');
        privacyPolicyService.get.resolves('my-template');
        templateService.getTemplate.returns(_.template('<html>{{policy}}</html>'));

        await privacyPolicyController.get(req, res);

        chai.expect(privacyPolicyService.get).to.have.been.calledOnceWithExactly('fr');
        chai.expect(config.translate).to.have.been.calledWithExactly('Back', 'fr');
        chai.expect(config.translate).to.have.been.calledWithExactly('login', 'fr');
        chai.expect(config.translate).to.have.been.calledWithExactly('privacy.policy', 'fr');
      });
    });

    it('uses configured default language if no cookie found', () => {
      privacyPolicyService.get.resolves('my-template');
      cookieService.get.returns(null);
      templateService.getTemplate.returns(_.template('<html>{{policy}}</html>'));

      return privacyPolicyController
        .get(req, res)
        .then(() => {
          chai.expect(privacyPolicyService.get.callCount).to.equal(1);
          chai.expect(privacyPolicyService.get.args[0][0]).to.equal(null);
          chai.expect(res.send.callCount).to.equal(1);
          chai.expect(config.translate.callCount).to.equal(3);
          chai.expect(config.translate.args[0][0]).to.equal('Back');
          chai.expect(config.translate.args[0][1]).to.equal(null);
          chai.expect(config.translate.args[1][0]).to.equal('login');
          chai.expect(config.translate.args[1][1]).to.equal(null);
          chai.expect(config.translate.args[2][0]).to.equal('privacy.policy');
          chai.expect(config.translate.args[2][1]).to.equal(null);
        });
    });

  });
});
