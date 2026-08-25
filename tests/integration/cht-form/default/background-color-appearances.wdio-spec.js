const mockConfig = require('../mock-config');
const genericForm = require('@page-objects/default/enketo/generic-form.wdio.page');

describe('cht-form web component - Background Color Appearances', () => {

  it('should apply background-red to text input question', async () => {
    await mockConfig.loadForm('default', 'test', 'appearances');
    const title = await genericForm.getFormTitle();
    expect(title).to.equal('Appearances');

    const redQuestion = await $('.or-appearance-background-red');
    expect(await redQuestion.isExisting()).to.be.true;
    const bgColor = await redQuestion.getCSSProperty('background-color');
    expect(bgColor.parsed.hex).to.equal('#f2dede');
  });

  it('should apply background-yellow to date input question', async () => {
    await mockConfig.loadForm('default', 'test', 'appearances');
    const yellowQuestion = await $('.or-appearance-background-yellow');
    expect(await yellowQuestion.isExisting()).to.be.true;
    const bgColor = await yellowQuestion.getCSSProperty('background-color');
    expect(bgColor.parsed.hex).to.equal('#fff3cd');
  });

  it('should apply background-green to select question', async () => {
    await mockConfig.loadForm('default', 'test', 'appearances');
    const greenQuestion = await $('.or-appearance-background-green');
    expect(await greenQuestion.isExisting()).to.be.true;
    const bgColor = await greenQuestion.getCSSProperty('background-color');
    expect(bgColor.parsed.hex).to.equal('#d4edda');
  });

  it('should apply background-blue to image upload question', async () => {
    await mockConfig.loadForm('default', 'test', 'appearances');
    const blueQuestion = await $('.or-appearance-background-blue');
    expect(await blueQuestion.isExisting()).to.be.true;
    const bgColor = await blueQuestion.getCSSProperty('background-color');
    expect(bgColor.parsed.hex).to.equal('#cce5ff');
  });

  it('should apply background-lime to geopoint question', async () => {
    await mockConfig.loadForm('default', 'test', 'appearances');
    const limeQuestion = await $('.or-appearance-background-lime');
    expect(await limeQuestion.isExisting()).to.be.true;
    const bgColor = await limeQuestion.getCSSProperty('background-color');
    expect(bgColor.parsed.hex).to.equal('#e8f5c8');
  });

});
