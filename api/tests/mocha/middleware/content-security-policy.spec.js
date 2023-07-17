const sinon = require('sinon');
const expect = require('chai').expect;

const middleware = require('../../../src/middleware/content-security-policy');
const serverUtils = require('../../../src/server-utils');
const settingsService = require('../../../src/services/settings');
const environment = require('../../../src/environment');

describe('Content Security Policy middleware', () => {
  beforeEach(() => {
    sinon.stub(settingsService, 'get');
    sinon.stub(serverUtils, 'error');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should create content security policy correctly', async () => {
    settingsService.get.resolves({ some: 'thing' });

    const policy = await middleware.get({}, {});

    expect(policy).to.deep.equal({
      hpkp: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [ `'none'` ],
          fontSrc: [ `'self'` ],
          manifestSrc: [ `'self'` ],
          connectSrc: [ `'self'`, environment.buildsUrl + '/', 'maps.googleapis.com' ],
          childSrc: [ `'self'` ],
          formAction: [ `'self'` ],
          imgSrc: [ `'self'`, 'data:', 'blob:', '*.openstreetmap.org' ],
          mediaSrc: [ `'self'`, 'blob:' ],
          scriptSrc: [
            `'self'`,
            `'sha256-B5cfIVb4/wnv2ixHP03bHeMXZDszDL610YG5wdDq/Tc='`,
            `'unsafe-eval'`,
            `'unsafe-hashes'`,
            `'sha256-2rvfFrggTCtyF5WOiTri1gDS8Boibj4Njn0e+VCBmDI='`,
          ],
          styleSrc: [ `'self'`, `'unsafe-inline'` ],
        },
        browserSniff: false,
      },
    });
    expect(settingsService.get.calledOnce).to.be.true;
    expect(serverUtils.error.notCalled).to.be.true;
  });

  it('should create content security policy correctly when usage analytics configured', async () => {
    settingsService.get.resolves({
      usage_analytics: {
        server_url: 'https://analytics.medic.org',
        site_id: '1',
        site_sha: 'sha256-PMJiIIDh',
      },
    });

    const policy = await middleware.get({}, {});

    expect(policy).to.deep.equal({
      hpkp: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [ `'none'` ],
          fontSrc: [ `'self'` ],
          manifestSrc: [ `'self'` ],
          connectSrc: [ `'self'`, environment.buildsUrl + '/', 'maps.googleapis.com', 'analytics.medic.org' ],
          childSrc: [ `'self'` ],
          formAction: [ `'self'` ],
          imgSrc: [ `'self'`, 'data:', 'blob:', '*.openstreetmap.org' ],
          mediaSrc: [ `'self'`, 'blob:' ],
          scriptSrc: [
            `'self'`,
            `'sha256-B5cfIVb4/wnv2ixHP03bHeMXZDszDL610YG5wdDq/Tc='`,
            `'unsafe-eval'`,
            `'unsafe-hashes'`,
            `'sha256-2rvfFrggTCtyF5WOiTri1gDS8Boibj4Njn0e+VCBmDI='`,
            `'sha256-PMJiIIDh'`,
            'analytics.medic.org',
          ],
          styleSrc: [ `'self'`, `'unsafe-inline'` ],
        },
        browserSniff: false,
      },
    });
    expect(settingsService.get.calledOnce).to.be.true;
    expect(serverUtils.error.notCalled).to.be.true;
  });

  it('should create content security policy correctly when missing site_sha', async () => {
    settingsService.get.resolves({ usage_analytics: { server_url: 'https://usage-analytics.medic.org' } });

    const policy = await middleware.get({}, {});

    expect(policy).to.deep.equal({
      hpkp: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [ `'none'` ],
          fontSrc: [ `'self'` ],
          manifestSrc: [ `'self'` ],
          connectSrc: [ `'self'`, environment.buildsUrl + '/', 'maps.googleapis.com', 'usage-analytics.medic.org' ],
          childSrc: [ `'self'` ],
          formAction: [ `'self'` ],
          imgSrc: [ `'self'`, 'data:', 'blob:', '*.openstreetmap.org' ],
          mediaSrc: [ `'self'`, 'blob:' ],
          scriptSrc: [
            `'self'`,
            `'sha256-B5cfIVb4/wnv2ixHP03bHeMXZDszDL610YG5wdDq/Tc='`,
            `'unsafe-eval'`,
            `'unsafe-hashes'`,
            `'sha256-2rvfFrggTCtyF5WOiTri1gDS8Boibj4Njn0e+VCBmDI='`,
          ],
          styleSrc: [ `'self'`, `'unsafe-inline'` ],
        },
        browserSniff: false,
      },
    });
    expect(settingsService.get.calledOnce).to.be.true;
    expect(serverUtils.error.notCalled).to.be.true;
  });

  it('should create content security policy correctly when missing server_url', async () => {
    settingsService.get.resolves({ usage_analytics: { site_sha: 'sha256-PMJiIIDh' } });

    const policy = await middleware.get({}, {});

    expect(policy).to.deep.equal({
      hpkp: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [ `'none'` ],
          fontSrc: [ `'self'` ],
          manifestSrc: [ `'self'` ],
          connectSrc: [ `'self'`, environment.buildsUrl + '/', 'maps.googleapis.com' ],
          childSrc: [ `'self'` ],
          formAction: [ `'self'` ],
          imgSrc: [ `'self'`, 'data:', 'blob:', '*.openstreetmap.org' ],
          mediaSrc: [ `'self'`, 'blob:' ],
          scriptSrc: [
            `'self'`,
            `'sha256-B5cfIVb4/wnv2ixHP03bHeMXZDszDL610YG5wdDq/Tc='`,
            `'unsafe-eval'`,
            `'unsafe-hashes'`,
            `'sha256-2rvfFrggTCtyF5WOiTri1gDS8Boibj4Njn0e+VCBmDI='`,
          ],
          styleSrc: [ `'self'`, `'unsafe-inline'` ],
        },
        browserSniff: false,
      },
    });
    expect(settingsService.get.calledOnce).to.be.true;
    expect(serverUtils.error.notCalled).to.be.true;
  });

  it('should handle exceptions', async () => {
    settingsService.get.rejects({ some: 'error' });

    await middleware.get({ any: 'req' }, { any: 'res' });

    expect(serverUtils.error.calledOnce).to.be.true;
    expect(serverUtils.error.args[0]).to.deep.equal([{ some: 'error' }, { any: 'req' }, { any: 'res' }]);
  });
});

