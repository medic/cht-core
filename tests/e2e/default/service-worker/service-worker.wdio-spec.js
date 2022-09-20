const { expect } = require('chai');
const URL = require('url');
const utils = require('../../../utils');
const loginPage = require('../../../page-objects/default/login/login.wdio.page');
const commonPage = require('../../../page-objects/default/common/common.wdio.page');

/* global caches fetch Response navigator */

const getCachedRequests = async (raw) => {
  const cacheDetails = await browser.executeAsync(async (callback) => {
    const cacheNames = await caches.keys();
    const cache = await caches.open(cacheNames[0]);
    const cachedRequests = await cache.keys();
    const cachedRequestSummary = cachedRequests.map(req => ({ url: req.url }));
    callback({
      name: cacheNames[0],
      requests: cachedRequestSummary,
    });
  });

  if (raw) {
    return cacheDetails;
  }

  const urls = cacheDetails.requests.map(request => URL.parse(request.url).pathname);
  urls.sort();
  return { name: cacheDetails.name, urls };
};

const stubAllCachedRequests = () => browser.executeAsync(async (callback) => {
  const cacheNames = await caches.keys();
  const cache = await caches.open(cacheNames[0]);
  const cachedRequests = await cache.keys();
  await Promise.all(cachedRequests.map(request => cache.put(request, new Response('cache'))));
  callback();
});

const doFetch = (path, headers) => browser.executeAsync(async (innerPath, innerHeaders, callback) => {
  const result = await fetch(innerPath, { headers: innerHeaders });
  callback({
    body: await result.text(),
    ok: result.ok,
    status: result.status,
  });
}, path, headers);

const unregisterServiceWorkerAndWipeAllCaches = () => browser.executeAsync(async (callback) => {
  const registrations = await navigator.serviceWorker.getRegistrations();
  registrations.forEach(registration => registration.unregister());

  const cacheNames = await caches.keys();
  for (const name of cacheNames) {
    await caches.delete(name);
  }

  callback();
});

const district = {
  _id: 'fixture:district',
  type: 'district_hospital',
  name: 'District',
  place_id: 'district',
  reported_date: new Date().getTime(),
};

const chw = {
  username: 'bob',
  password: 'medic.123',
  place: 'fixture:district',
  contact: { _id: 'fixture:user:bob', name: 'Bob' },
  roles: ['chw'],
};

const login = async () => {
  await browser.throttle('online');
  await loginPage.login(chw);
  await commonPage.waitForPageLoaded();
};

const SW_SUCCESSFUL_REGEX = /Service worker generated successfully/;

describe('Service worker cache', () => {
  before(async () => {
    await utils.saveDoc(district);
    await utils.createUsers([chw]);

    await login();
    await commonPage.closeTour();
  });

  it('confirm initial list of cached resources', async () => {
    const cacheDetails = await getCachedRequests();

    expect(cacheDetails.name.startsWith('sw-precache-v3-cache-')).to.be.true;
    expect(cacheDetails.urls).to.have.members([
      '/',
      '/audio/alert.mp3',
      '/fontawesome-webfont.woff2',
      '/fonts/NotoSans-Bold.ttf',
      '/fonts/NotoSans-Regular.ttf',
      '/fonts/enketo-icons-v2.woff',
      '/img/icon.png',
      '/img/icon-chw-selected.svg',
      '/img/icon-chw.svg',
      '/img/icon-nurse-selected.svg',
      '/img/icon-nurse.svg',
      '/img/icon-pregnant-selected.svg',
      '/img/icon-pregnant.svg',
      '/img/layers.png',
      '/img/setup-wizard-demo.png',
      '/login/lib-bowser.js',
      '/login/script.js',
      '/login/style.css',
      '/main.js',
      '/manifest.json',
      '/medic/_design/medic/_rewrite/',
      '/medic/login',
      '/polyfills-es5.js',
      '/polyfills.js',
      '/runtime.js',
      '/scripts.js',
      '/styles.css'
    ]);
  });

  it('branding updates trigger login page refresh', async () => {
    const waitForLogs = await utils.waitForApiLogs(SW_SUCCESSFUL_REGEX);
    const branding = await utils.getDoc('branding');
    branding.title = 'Not Medic';
    await utils.saveDoc(branding);
    await waitForLogs.promise;

    await commonPage.sync(true);
    await browser.throttle('offline'); // make sure we load the login page from cache
    await commonPage.logout();
    expect(await browser.getTitle()).to.equal('Not Medic');

    await login();
  });

  it('login page translation updates trigger login page refresh', async () => {
    const waitForLogs = await utils.waitForApiLogs(SW_SUCCESSFUL_REGEX);
    await utils.addTranslations('en', {
      'User Name': 'NotUsername',
      'login': 'NotLogin',
    });
    await waitForLogs.promise;

    await commonPage.sync(true);
    await browser.throttle('offline'); // make sure we load the login page from cache
    await commonPage.logout();

    expect(await (await loginPage.labelForUser()).getText()).to.equal('NotUsername');
    expect(await (await loginPage.loginButton()).getText()).to.equal('NotLogin');

    await login();
  });

  it('adding new languages triggers login page refresh', async () => {
    const waitForLogs = await utils.waitForApiLogs(SW_SUCCESSFUL_REGEX);
    await utils.addTranslations('ro', {
      'User Name': 'Utilizator',
      'Password': 'Parola',
      'login': 'Autentificare',
    });
    await waitForLogs.promise;

    await commonPage.sync(true);
    await commonPage.logout();

    await loginPage.changeLanguage('ro', 'Utilizator');

    expect(await (await loginPage.labelForUser()).getText()).to.equal('Utilizator');
    expect(await (await loginPage.loginButton()).getText()).to.equal('Autentificare');
    expect(await (await loginPage.labelForPassword()).getText()).to.equal('Parola');

    await login();
  });

  it('other translation updates do not trigger a login page refresh', async () => {
    await commonPage.sync();

    const cacheDetails = await getCachedRequests(true);

    const waitForLogs = await utils.waitForApiLogs(SW_SUCCESSFUL_REGEX);
    await utils.addTranslations('en', {
      'ran': 'dom',
      'some': 'thing',
    });
    await waitForLogs.promise;
    await commonPage.sync(false);

    const updatedCacheDetails = await getCachedRequests(true);

    // login page has the same hash
    const initial = cacheDetails.requests.find(request => request.url.startsWith('/medic/login'));
    const updated = updatedCacheDetails.requests.find(request => request.url.startsWith('/medic/login'));
    expect(initial).to.deep.equal(updated);
  });

  it('should load the page while offline', async () => {
    await browser.throttle('offline');
    await browser.refresh();
    await (await commonPage.analyticsTab()).waitForDisplayed();
    await browser.throttle('online');
  });

  it('confirm fetch yields cached result', async () => {
    const expectCachedState = async (expectCached, path, headers = {}) => {
      const result = await doFetch(path, headers);
      expect(result.body === 'cache').to.eq(expectCached, JSON.stringify({ path, headers }, null, 2));
    };

    try {
      const { urls: initialCachedUrls } = await getCachedRequests();
      await stubAllCachedRequests();

      await expectCachedState(true, '/');
      await expectCachedState(true, '/', {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*!/!*;' +
        'q=0.8,application/signed-exchange;v=b3'
      });

      await expectCachedState(true, '/medic/login');
      await expectCachedState(true, '/medic/login', {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*!/!*;' +
        'q=0.8,application/signed-exchange;v=b3'
      });
      await expectCachedState(true, '/medic/login?redirect=place&username=user');

      await expectCachedState(true, '/medic/_design/medic/_rewrite/');
      await expectCachedState(true, '/medic/_design/medic/_rewrite/', {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*!/!*;' +
        'q=0.8,application/signed-exchange;v=b3'
      });

      // no part of syncing is cached
      await expectCachedState(false, '/dbinfo', { 'Accept': 'application/json' });
      await expectCachedState(false, '/medic/_changes?style=all_docs&limit=100');

      // confirm no additional requests were added into the cache
      const { urls: resultingCachedUrls } = await getCachedRequests();

      expect(resultingCachedUrls).to.deep.eq(initialCachedUrls);
    } finally {
      // since we've broken the cache. for sw registration
      await unregisterServiceWorkerAndWipeAllCaches();
    }
  });
});
