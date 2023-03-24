import { Component } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import * as passwordTester from 'simple-password-tester';
import { ModalService } from '@mm-modals/mm-modal/mm-modal';

import { MmModalAbstract } from '@mm-modals/mm-modal/mm-modal';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { UpdatePasswordService } from '@mm-services/update-password.service';
import { UserLoginService } from '@mm-services/user-login.service';
import { TranslateService } from '@mm-services/translate.service';
import { ConfirmPasswordUpdatedComponent } from '@mm-modals/edit-user/confirm-password-updated.component';

const PASSWORD_MINIMUM_LENGTH = 8;
const PASSWORD_MINIMUM_SCORE = 50;

@Component({
  selector: 'update-password',
  templateUrl: './update-password.component.html'
})
export class UpdatePasswordComponent extends MmModalAbstract {

  editUserModel: {
    username?;
    currentPassword?;
    password?;
    passwordConfirm?;
  } = {};

  errors: {
    currentPassword?;
    password?;
  } = {};

  static id = 'update-password-modal';

  constructor(
    bsModalRef: BsModalRef,
    private userSettingsService: UserSettingsService,
    private updatePasswordService: UpdatePasswordService,
    private userLoginService: UserLoginService,
    private translateService:TranslateService,
    private modalService: ModalService,
  ) {
    super(bsModalRef);
  }

  async updatePassword() {
    this.errors = {};
    this.setProcessing();
    if (!await this.validatePasswordFields()) {
      this.setError();
      return;
    }
    const newPassword = this.editUserModel.password;
    const currentPassword = this.editUserModel.currentPassword;
    try {
      const user:any = await this.userSettingsService.get();
      const username = user.name;
      await this.updatePasswordService.update(username, currentPassword, newPassword);
      try {
        await this.userLoginService.login(username, newPassword);
      } catch(err) {
        if (err.status === 302) {
          this.setFinished();
          this.close();
          this.modalService
            .show(ConfirmPasswordUpdatedComponent)
            .catch(() => {})
            .finally(() => this.windowReload());
        } else {
          this.windowReload();
        }
      }
    } catch(err) {
      if (err.status === 0) { // offline status
        const message = await this.translateService.get('online.action.message');
        this.errors.currentPassword = message;
        this.setError(err, message);
        return;
      }
      if (err.status === 401) {
        const message = await this.translateService.get('password.incorrect');
        this.errors.currentPassword = message;
        this.setError(err, message);
        return;
      }
      this.setError(err, 'Error updating user');
    }
  }

  private windowReload() {
    window.location.reload();
  }

  private async validatePasswordFields() {
    return await this.validateRequired('password', 'Password') &&
      await this.validateRequired('currentPassword', 'Current Password') &&
      await this.validatePasswordStrength() &&
      await this.validateConfirmPasswordMatches();
  }

  private async validateRequired(fieldName, fieldDisplayName) {
    if (this.editUserModel[fieldName]) {
      return true;
    }
    try {
      const value = await this.translateService.fieldIsRequired(fieldDisplayName);
      this.errors[fieldName] = value;
    } catch (err) {
      console.error(`Error translating field display name '${fieldDisplayName}'`, err);
    }
    return false;
  }

  private async validatePasswordStrength() {
    const password = this.editUserModel.password || '';
    if (password.length < PASSWORD_MINIMUM_LENGTH) {
      const value = await this.translateService.get('password.length.minimum', { minimum: PASSWORD_MINIMUM_LENGTH });
      this.errors.password = value;
      return false;
    }
    if (passwordTester(password) < PASSWORD_MINIMUM_SCORE) {
      const value = await this.translateService.get('password.weak');
      this.errors.password = value;
      return false;
    }
    return true;
  }

  private async validateConfirmPasswordMatches() {
    if (this.editUserModel.password !== this.editUserModel.passwordConfirm) {
      const value = await this.translateService.get('Passwords must match');
      this.errors.password = value;
      return false;
    }
    return true;
  }
}
