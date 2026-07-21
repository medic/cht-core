const mockConfig = require('../mock-config');

describe('cht-form web component - Bikram Sambat Widget', () => {

  beforeEach(async () => {
    await mockConfig.loadForm('default', 'test', 'bikram_sambat_widget');
    const firstWidget = await $('.bikram-sambat-widget');
    await firstWidget.waitForDisplayed({ timeout: 5000 });
  });

  it('hides the native date input', async () => {
    // There should be two native date inputs hidden from screen readers and keyboard focus
    const nativeInputs = await $$('input[type="date"]');
    expect(nativeInputs).to.have.lengthOf(2);

    for (const nativeInput of nativeInputs) {
      expect(await nativeInput.isDisplayed()).to.be.false;
    }
  });

  it('pre-populates manual fields correctly with Devanagari numbers on load', async () => {
    // The second widget is pre-populated with "2024-06-29" -> 2081-03-15 BS
    const widgets = await $$('.bikram-sambat-widget');
    expect(widgets).to.have.lengthOf(2);

    const populatedWidget = widgets[1];
    const dayVal = await populatedWidget.$('[name="day"]').getValue();
    const yearVal = await populatedWidget.$('[name="year"]').getValue();
    const monthText = (await populatedWidget.$('.month-dropdown button').getText()).trim();

    // Verify Devanagari numbers and month text are correct
    expect(dayVal).to.equal('१५');
    expect(monthText).to.equal('असार');
    expect(yearVal).to.equal('२०८१');
  });

  it('clears populated values when manual fields are cleared', async () => {
    const widgets = await $$('.bikram-sambat-widget');
    const populatedWidget = widgets[1];

    // Clear the day input manually
    const dayInput = await populatedWidget.$('[name="day"]');
    await dayInput.setValue('');

    // Trigger blur/change events by focusing/clicking the year field
    const yearInput = await populatedWidget.$('[name="year"]');
    await yearInput.click();

    // Trigger blur/change events to run the guard
    const parentLabel = await populatedWidget.parentElement();
    const realInput = await parentLabel.$('input[type="date"]');
    
    // Verify the real date input gets cleared by the widget guard
    await browser.waitUntil(async () => {
      return (await realInput.getValue()) === '';
    }, {
      timeout: 5000,
      timeoutMsg: 'Expected native input to be cleared after resetting day'
    });
  });

  it('configures dialog ARIA attributes and restores focus to calendar button on close', async () => {
    const widgets = await $$('.bikram-sambat-widget');
    const firstWidget = widgets[0];

    const calBtn = await firstWidget.$('.calendar-btn');
    await calBtn.click();

    // Verify picker is open and dialog ARIA properties are set
    const picker = await $('.nepali-date-picker');
    expect(await picker.isDisplayed()).to.be.true;
    expect(await picker.getAttribute('role')).to.equal('dialog');
    expect(await picker.getAttribute('aria-modal')).to.equal('true');

    // Click close button inside the picker
    const closeBtn = await picker.$('.close-btn');
    await closeBtn.click();

    // Verify picker is closed
    expect(await picker.isDisplayed()).to.be.false;

    // Focus should be restored back to the calendar button
    const isFocused = await browser.execute((btn) => document.activeElement === btn, calBtn);
    expect(isFocused).to.be.true;
  });

  it('traps keyboard focus (Tab / Shift+Tab) inside the calendar picker dialog', async () => {
    const widgets = await $$('.bikram-sambat-widget');
    const firstWidget = widgets[0];

    const calBtn = await firstWidget.$('.calendar-btn');
    await calBtn.click();

    const picker = await $('.nepali-date-picker');
    
    // Find all focusable elements inside picker
    const selector = 'button, select, input, a, [tabindex]:not([tabindex="-1"])';
    const focusable = await picker.$$(selector);
    expect(focusable.length).to.be.greaterThan(1);

    const firstEl = focusable[0];
    const lastEl = focusable[focusable.length - 1];

    // Focus the first element, send Shift+Tab, verify focus wraps to the last element
    await browser.execute((el) => el.focus(), firstEl);
    await browser.keys(['Shift', 'Tab']);
    const wrapsToLast = await browser.execute((el) => document.activeElement === el, lastEl);
    expect(wrapsToLast).to.be.true;

    // Focus the last element, send Tab, verify focus wraps back to the first element
    await browser.execute((el) => el.focus(), lastEl);
    await browser.keys(['Tab']);
    const wrapsToFirst = await browser.execute((el) => document.activeElement === el, firstEl);
    expect(wrapsToFirst).to.be.true;

    // Close the picker
    const closeBtn = await picker.$('.close-btn');
    await closeBtn.click();
  });

  it('cleans up body-appended picker elements when form is destroyed (cancelForm)', async () => {
    const widgets = await $$('.bikram-sambat-widget');
    const firstWidget = widgets[0];

    // Open picker so it gets appended to body
    const calBtn = await firstWidget.$('.calendar-btn');
    await calBtn.click();

    expect(await $('.nepali-date-picker').isExisting()).to.be.true;
    expect(await $('.nepali-date-picker-overlay').isExisting()).to.be.true;

    // Destroy the form
    await mockConfig.cancelForm();

    // Verify both are completely cleaned up from body to prevent memory leaks
    expect(await $('.nepali-date-picker').isExisting()).to.be.false;
    expect(await $('.nepali-date-picker-overlay').isExisting()).to.be.false;
  });

  it('sanitizes all href attributes in calendar to prevent XSS javascript injections', async () => {
    const widgets = await $$('.bikram-sambat-widget');
    const firstWidget = widgets[0];

    const calBtn = await firstWidget.$('.calendar-btn');
    await calBtn.click();

    // Inspect all links inside the picker
    const picker = await $('.nepali-date-picker');
    const links = await picker.$$('a');
    expect(links.length).to.be.greaterThan(0);

    for (const link of links) {
      const href = await link.getAttribute('href');
      // No links should use javascript: or arbitrary protocols
      if (href) {
        expect(href.trim().toLowerCase().startsWith('javascript:')).to.be.false;
      }
    }

    // Close picker
    const closeBtn = await picker.$('.close-btn');
    await closeBtn.click();
  });
});
