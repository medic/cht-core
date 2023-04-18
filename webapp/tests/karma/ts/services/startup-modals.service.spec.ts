import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

import { SettingsService } from '@mm-services/settings.service';
import { StartupModalsService } from '@mm-services/startup-modals.service';
import { UpdateSettingsService } from '@mm-services/update-settings.service';
import { ModalService } from '@mm-modals/mm-modal/mm-modal';
import { GuidedSetupComponent } from '@mm-modals/guided-setup/guided-setup.component';

describe('StartupModalsService', () => {

  let service: StartupModalsService;
  let modalService;
  let settingsService;
  let updateSettingsService;
  let consoleErrorMock;

  beforeEach(() => {
    modalService = { show: sinon.stub() };
    settingsService = { get: sinon.stub() };
    updateSettingsService = { update: sinon.stub() };
    consoleErrorMock = sinon.stub(console, 'error');

    TestBed.configureTestingModule({
      providers: [
        { provide: ModalService, useValue: modalService },
        { provide: SettingsService, useValue: settingsService },
        { provide: UpdateSettingsService, useValue: updateSettingsService },
      ]
    });

    service = TestBed.inject(StartupModalsService);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should show Guided Setup modal', async () => {
    settingsService.get.resolves({ setup_complete: false });
    modalService.show.resolves();

    await service.showStartupModals();

    expect(consoleErrorMock.notCalled).to.be.true;
    expect(modalService.show.calledOnce).to.be.true;
    expect(modalService.show.args[0][0]).to.equal(GuidedSetupComponent);
    expect(updateSettingsService.update.calledOnce).to.be.true;
    expect(updateSettingsService.update.args[0][0]).to.deep.equal({ setup_complete: true });
  });

  it('should catch errors when showing Guided Setup modal', async () => {
    settingsService.get.rejects(new Error('some other errors'));

    await service.showStartupModals();

    expect(modalService.show.notCalled).to.be.true;
    expect(updateSettingsService.update.notCalled).to.be.true;
    expect(consoleErrorMock.calledOnce).to.be.true;
    expect(consoleErrorMock.args[0][0]).to.equal('Error fetching settings');
    expect(consoleErrorMock.args[0][1].message).to.equal('some other errors');
  });

  it('should catch errors when updating the user settings', async () => {
    settingsService.get.resolves({ setup_complete: false });
    modalService.show.resolves();
    updateSettingsService.update.rejects(new Error('some error'));

    await service.showStartupModals();

    expect(modalService.show.calledOnce).to.be.true;
    expect(modalService.show.args[0][0]).to.equal(GuidedSetupComponent);

    expect(updateSettingsService.update.calledOnce).to.be.true;
    expect(updateSettingsService.update.args[0][0]).to.deep.equal({ setup_complete: true });
    expect(consoleErrorMock.calledOnce).to.be.true;
    expect(consoleErrorMock.args[0][0]).to.equal('Error updating settings');
    expect(consoleErrorMock.args[0][1].message).to.equal('some error');
  });
});
