import { SessionService } from '@mm-services/session.service';
import { SettingsService } from '@mm-services/settings.service';
import { StartupModalsService } from '@mm-services/startup-modals.service';
import { UpdateSettingsService } from '@mm-services/update-settings.service';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { TourService } from '@mm-services/tour.service';
import { ModalService } from '@mm-modals/mm-modal/mm-modal';

import { TestBed } from '@angular/core/testing';
import sinon from 'sinon';
import { expect } from 'chai';

describe('StartupModalsService', () => {

  let service: StartupModalsService;
  let modalService;
  let userSettingsService;

  afterEach(() => {
    sinon.restore();
  });

  const getProviders = (toursResult) => {
    return [
      {
        provide: SessionService,
        useValue: {
          userCtx: () => ({ name: 'no_error' }),
          isOnlineOnly: () => true
        }
      },
      {
        provide: UserSettingsService,
        useValue: {
          get: () => ({ name: 'person' }),
          setAsKnown: sinon.stub().resolves()
        }
      },
      { provide: SettingsService, useValue: { get: () => ({ setup_complete: true }) } },
      { provide: UpdateSettingsService, useValue: { update: sinon.stub().resolves() } },
      { provide: ModalService, useValue: { show: sinon.stub().resolves() } },
      { provide: TourService, useValue: { getTours: sinon.stub().resolves(toursResult) } },
    ];
  };

  const injectService = () => {
    service = TestBed.inject(StartupModalsService);
    modalService = TestBed.inject(ModalService);
    userSettingsService = TestBed.inject(UserSettingsService);
  };

  describe('showStartupModals', () => {

    it('Tour modal should not be displayed if no tours are available', async () => {
      TestBed.configureTestingModule({
        providers: getProviders([]),
      });
      injectService();
      await service.showStartupModals();
      expect(modalService.show.callCount).to.equal(0);
      expect(userSettingsService.setAsKnown.callCount).to.equal(0);
    });

    it('Tour modal should be displayed if tours are available', async () => {
      TestBed.configureTestingModule({
        providers: getProviders([{ order: 1, id: 'tasks', icon: 'fa-flag', name: 'Tasks' }]),
      });
      injectService();
      await service.showStartupModals();
      expect(modalService.show.callCount).to.equal(1);
      expect(userSettingsService.setAsKnown.callCount).to.equal(1);
    });
  });
});
