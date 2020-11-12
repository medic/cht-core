import { expect } from 'chai';
import sinon from 'sinon';

import { PhonePipe } from '@mm-pipes/phone.pipe';

describe('PhonePipe', () => {
  let settings;
  let sanitizer;

  let pipe;

  beforeEach(() => {
    settings = { get: sinon.stub() };
    sanitizer = { bypassSecurityTrustHtml: sinon.stub().returnsArg(0) };
  });

  afterEach(() => sinon.restore());

  const assertResult = (result, expectedFormatted, expectedRaw) => {
    // the result is html!
    const html = $(result);
    expect(html.is('p')).to.equal(true);

    expect(html.children().length).to.equal(2);

    expect(html.children('a').length).to.equal(1);
    expect(html.children('a').first().hasClass('mobile-only')).to.equal(true);
    expect(html.children('a').first().attr('href')).to.equal(`tel:${expectedRaw}`);
    expect(html.children('a').first().html()).to.equal(expectedFormatted);

    expect(html.children('span').length).to.equal(1);
    expect(html.children('span').first().hasClass('desktop-only')).to.equal(true);
    expect(html.children('span').first().html()).to.equal(expectedFormatted);
  };

  it('should return undefined when no phone', async () => {
    settings.get.resolves({});
    pipe = new PhonePipe(settings, sanitizer);
    expect(pipe.transform('')).to.equal(undefined);
  });

  it('should return unchanged value when no settings', async () => {
    settings.get.resolves(false);
    pipe = new PhonePipe(settings, sanitizer);
    await Promise.resolve(); // resolve settings request
    const result = pipe.transform('phoneNumber');
    assertResult(result, 'phoneNumber', 'phoneNumber');
  });

  it('should return formatted value when settings exist', async () => {
    settings.get.resolves({ default_country_code: 'KE' });
    pipe = new PhonePipe(settings, sanitizer);
    await Promise.resolve(); // resolve settings request

    let raw = '+40755232323';
    let formatted = '+40 755 232 323';
    assertResult(pipe.transform(raw), formatted, raw);

    raw = '+254709810001';
    formatted = '+254 709 810001';
    assertResult(pipe.transform(raw), formatted, raw);
  });

  it('should validate phone numbers', async () => {
    settings.get.resolves({ default_country_code: 'KE' });
    pipe = new PhonePipe(settings, sanitizer);
    await Promise.resolve(); // resolve settings request

    const raw = 'random'; // invalid phone, shouldn't get formatted
    const formatted = 'random';
    assertResult(pipe.transform(raw), formatted, raw);
  });
});
