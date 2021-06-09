class CommonPage {
  get hamburgerMenu() { return $('#header-dropdown-link'); }
  get logoutButton() { return $('.fa-power-off'); }
  get modalBody() { return $('div.modal-body'); }
  get yesButton() { return $('a.btn.submit.btn-danger'); }
  // const modal = $('div.modal-dialog');
  async logout() {
    await (await this.hamburgerMenu).click();
    await (await this.logoutButton).click();
    (await this.modalBody).waitForDisplayed();
    const warning = await (await this.modalBody).getText();
    await (await this.yesButton).click();
    // await helper.waitUntilReadyNative(element(by.css('form#form')));
    return warning;
  }
}

module.exports = new CommonPage();
