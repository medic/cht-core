import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { expect } from 'chai';

import { routes as displayRoutes } from '@admin-tool-modules/display/display.routes';
import { routes as usersRoutes } from '@admin-tool-modules/users/users.routes';
import { routes as authorizationRoutes } from '@admin-tool-modules/authorization/authorization.routes';
import { routes as smsRoutes } from '@admin-tool-modules/sms/sms.routes';
import { routes as formsRoutes } from '@admin-tool-modules/forms/forms.routes';
import { routes as targetsRoutes } from '@admin-tool-modules/targets/targets.routes';
import { routes as imagesRoutes } from '@admin-tool-modules/images/images.routes';
import { routes as messageQueueRoutes } from '@admin-tool-modules/message-queue/message-queue.routes';
import { routes as upgradeRoutes } from '@admin-tool-modules/upgrade/upgrade.routes';
import { routes as exportRoutes } from '@admin-tool-modules/export/export.routes';
import { routes as backupRoutes } from '@admin-tool-modules/backup/backup.routes';

import { AppRoutingModule } from '../../../src/ts/app-routing.module';
import { DisplayComponent } from '@admin-tool-modules/display/display.component';
import { UsersComponent } from '@admin-tool-modules/users/users.component';
import { AuthorizationComponent } from '@admin-tool-modules/authorization/authorization.component';
import { SmsComponent } from '@admin-tool-modules/sms/sms.component';
import { FormsComponent } from '@admin-tool-modules/forms/forms.component';
import { TargetsComponent } from '@admin-tool-modules/targets/targets.component';
import { ImagesComponent } from '@admin-tool-modules/images/images.component';
import { MessageQueueComponent } from '@admin-tool-modules/message-queue/message-queue.component';
import { UpgradeComponent } from '@admin-tool-modules/upgrade/upgrade.component';
import { ExportComponent } from '@admin-tool-modules/export/export.component';
import { BackupComponent } from '@admin-tool-modules/backup/backup.component';

describe('AppRoutingModule', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule, AppRoutingModule],
    });
  });

  it('should be created', () => {
    const module = TestBed.inject(AppRoutingModule);
    expect(module).to.exist;
  });

  describe('route definitions', () => {
    it('display routes should point to /display with DisplayComponent', () => {
      expect(displayRoutes).to.have.length(1);
      expect(displayRoutes[0].path).to.equal('display');
      expect(displayRoutes[0].component).to.equal(DisplayComponent);
    });

    it('users routes should point to /users with UsersComponent', () => {
      expect(usersRoutes).to.have.length(1);
      expect(usersRoutes[0].path).to.equal('users');
      expect(usersRoutes[0].component).to.equal(UsersComponent);
    });

    it('authorization routes should point to /authorization with AuthorizationComponent', () => {
      expect(authorizationRoutes).to.have.length(1);
      expect(authorizationRoutes[0].path).to.equal('authorization');
      expect(authorizationRoutes[0].component).to.equal(AuthorizationComponent);
    });

    it('sms routes should point to /sms with SmsComponent', () => {
      expect(smsRoutes).to.have.length(1);
      expect(smsRoutes[0].path).to.equal('sms');
      expect(smsRoutes[0].component).to.equal(SmsComponent);
    });

    it('forms routes should point to /forms with FormsComponent', () => {
      expect(formsRoutes).to.have.length(1);
      expect(formsRoutes[0].path).to.equal('forms');
      expect(formsRoutes[0].component).to.equal(FormsComponent);
    });

    it('targets routes should point to /targets with TargetsComponent', () => {
      expect(targetsRoutes).to.have.length(1);
      expect(targetsRoutes[0].path).to.equal('targets');
      expect(targetsRoutes[0].component).to.equal(TargetsComponent);
    });

    it('images routes should point to /images with ImagesComponent', () => {
      expect(imagesRoutes).to.have.length(1);
      expect(imagesRoutes[0].path).to.equal('images');
      expect(imagesRoutes[0].component).to.equal(ImagesComponent);
    });

    it('message-queue routes should point to /message-queue with MessageQueueComponent', () => {
      expect(messageQueueRoutes).to.have.length(1);
      expect(messageQueueRoutes[0].path).to.equal('message-queue');
      expect(messageQueueRoutes[0].component).to.equal(MessageQueueComponent);
    });

    it('upgrade routes should point to /upgrade with UpgradeComponent', () => {
      expect(upgradeRoutes).to.have.length(1);
      expect(upgradeRoutes[0].path).to.equal('upgrade');
      expect(upgradeRoutes[0].component).to.equal(UpgradeComponent);
    });

    it('export routes should point to /export with ExportComponent', () => {
      expect(exportRoutes).to.have.length(1);
      expect(exportRoutes[0].path).to.equal('export');
      expect(exportRoutes[0].component).to.equal(ExportComponent);
    });

    it('backup routes should point to /backup with BackupComponent', () => {
      expect(backupRoutes).to.have.length(1);
      expect(backupRoutes[0].path).to.equal('backup');
      expect(backupRoutes[0].component).to.equal(BackupComponent);
    });
  });
});
