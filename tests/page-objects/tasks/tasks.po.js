module.exports = {
  checkItemSummary : (place, contact) => {
    const summaryElement = element(by.css('#reports-content .item-summary'));
    expect(summaryElement.element(by.css('.sender .name')).getText()).toMatch(`Submitted by ${contact.name}`);
    expect(summaryElement.element(by.css('.subject .name')).getText()).toBe('Siobhan');
    expect(summaryElement.element(by.css('.sender .phone')).getText()).toBe(contact.phone);
    expect(summaryElement.element(by.css('.position a')).getText()).toBe(place.name);
    expect(summaryElement.element(by.css('.detail')).isDisplayed()).toBeTruthy();
    expect(summaryElement.element(by.css('.detail .status')).isDisplayed()).toBe(false);
  },

  checkAutoResponse : (contact, expectedDate) => {
    const taskElement = element(by.css('#reports-content .details > ul'));
    expect(taskElement.element(by.css('.task-list > li:nth-child(1) > ul > li')).getText())
      .toBe('Thank you '+ contact.name +' for registering Siobhan');
    expect(taskElement.element(
      by.css('.task-list > li:nth-child(1) .task-state .state.forwarded-to-gateway')).isDisplayed()
    ).toBeTruthy();
    expect(taskElement.element(by.css('.task-list > li:nth-child(1) .task-state .recipient')).getText())
      .toBe(' to +64271234567');

    expect(taskElement.element(by.css('.task-list > li:nth-child(2) > ul > li')).getText())
      .toBe('LMP ' + expectedDate.locale('sw').format('ddd, MMM Do, YYYY'));
    expect(taskElement.element(
      by.css('.task-list > li:nth-child(2) .task-state .state.forwarded-to-gateway')).isDisplayed()
    ).toBeTruthy();
    expect(taskElement.element(by.css('.task-list > li:nth-child(2) .task-state .recipient')).getText())
      .toBe(' to +64271234567');
  },

  checkScheduledTask : (childIndex, title, message) => {
    const taskElement = element(by.css(
      '#reports-content .details .scheduled-tasks > ul > li:nth-child(' + childIndex + ')'
    ));
    expect(taskElement.element(by.css('h3')).getText()).toContain(title);
    expect(taskElement.element(by.css('.task-list li > ul > li')).getText()).toBe(message);
    expect(taskElement.element(by.css('.task-list li .task-state .state.scheduled')).isDisplayed()).toBeTruthy();
    expect(taskElement.element(by.css('.task-list li .task-state .recipient')).getText()).toBe(' to +64271234567');
  }

};
