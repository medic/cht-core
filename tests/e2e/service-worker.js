const { expect } = require('chai');
const URL = require('url');
const utils = require('../utils');

/* global caches fetch Response navigator */

const getCachedRequests = async () => {
  const cacheDetails = await browser.executeAsyncScript(async () => {
    const callback = arguments[arguments.length - 1];
    const cacheNames = await caches.keys();
    const cache = await caches.open(cacheNames[0]);
    const cachedRequests = await cache.keys();
    const cachedRequestSummary = cachedRequests.map(req => ({ url: req.url }));
    callback({
      name: cacheNames[0],
      requests: cachedRequestSummary,
    });
  });

  const urls = cacheDetails.requests.map(request => URL.parse(request.url).pathname);
  urls.sort();
  return { name: cacheDetails.name, urls };
};

const stubAllCachedRequests = () => browser.executeAsyncScript(async () => {
  const callback = arguments[arguments.length - 1];
  const cacheNames = await caches.keys();
  const cache = await caches.open(cacheNames[0]);
  const cachedRequests = await cache.keys();
  await Promise.all(cachedRequests.map(request => cache.put(request, new Response('cache'))));
  callback();
});

const doFetch = (path, headers) => browser.executeAsyncScript(async (innerPath, innerHeaders) => {
  const callback = arguments[arguments.length - 1];
  const result = await fetch(innerPath, { headers: innerHeaders });
  callback({
    body: await result.text(),
    ok: result.ok,
    status: result.status,
  });
}, path, headers);

const unregisterServiceWorkerAndWipeAllCaches = () => browser.executeAsyncScript(async () => {
  const callback = arguments[arguments.length - 1];

  const registrations = await navigator.serviceWorker.getRegistrations();
  registrations.forEach(registration => registration.unregister());

  const cacheNames = await caches.keys();
  cacheNames.forEach(async (name) => await caches.delete(name));

  callback();
});

describe('Service worker cache', () => {
  afterEach(utils.afterEach);

  it('confirm initial list of cached resources', async () => {
    const cacheDetails = await getCachedRequests();
    expect(cacheDetails.name.startsWith('sw-precache-v3-cache-')).to.be.true;
    expect(cacheDetails.urls).to.deep.eq([
      '/',
      '/audio/alert.mp3',
      '/css/inbox.css',
      '/fonts/NotoSans-Bold.ttf',
      '/fonts/NotoSans-Regular.ttf',
      '/fonts/enketo-icons-v2.woff',
      '/fonts/fontawesome-webfont.woff2',
      '/img/icon-chw-selected.svg',
      '/img/icon-chw.svg',
      '/img/icon-nurse-selected.svg',
      '/img/icon-nurse.svg',
      '/img/icon-pregnant-selected.svg',
      '/img/icon-pregnant.svg',
      '/img/setup-wizard-demo.png',
      '/img/simprints.png',
      '/js/inbox.js',
      '/js/templates.js',
      '/login/script.js',
      '/login/style.css',
      '/manifest.json',
      '/medic/_design/medic/_rewrite/',
      '/medic/login',
    ]);
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
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;' +
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
