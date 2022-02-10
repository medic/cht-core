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

  updatePassword() {
    this.errors = {};
    this.setProcessing();
    if (this.validatePasswordFields()) {
      const newPassword = this.editUserModel.password;
      const currentPassword = this.editUserModel.currentPassword;
      return this.userSettingsService.get()
        .then((user:any) => {
          const username = user.name;
          return this.updatePasswordService
            .update(username, currentPassword, newPassword)
            .then(() => {
              return this.userLoginService
                .login(username, newPassword)
                .catch(err => {
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
                });
            })
            .catch(err => {
              if (err.status === 0) { //Offline Status
                this.translateService.get('online.action.message').then(value => {
                  this.errors.currentPassword = value;
                  this.setError(err, value);
                });
              } else if (err.status === 401) {
                this.translateService.get('password.incorrect').then(value => {
                  this.errors.currentPassword = value;
                  this.setError(err, value);
                });
              } else {
                this.setError(err, 'Error updating user');
              }
            });
        });
    } else {
      this.setError();
    }
  }

  private windowReload() {
    window.location.reload(true);
  }

  private validatePasswordFields() {
    return this.validateRequired('password', 'Password') &&
      this.validateRequired('currentPassword', 'Current Password') &&
      this.validatePasswordStrength() &&
      this.validateConfirmPasswordMatches();
  }

  private validateRequired(fieldName, fieldDisplayName) {
    if (!this.editUserModel[fieldName]) {
      this.translateService
        .fieldIsRequired(fieldDisplayName)
        .then(value => {
          this.errors[fieldName] = value;
        })
        .catch(err => {
          console.error(`Error translating field display name '${fieldDisplayName}'`, err);
        });
      return false;
    }
    return true;
  }

  private validatePasswordStrength() {
    const password = this.editUserModel.password || '';
    if (password.length < PASSWORD_MINIMUM_LENGTH) {
      this.translateService
        .get('password.length.minimum', { minimum: PASSWORD_MINIMUM_LENGTH })
        .then((value) => {
          this.errors.password = value;
        });
      return false;
    }
    if (passwordTester(password) < PASSWORD_MINIMUM_SCORE) {
      this.translateService
        .get('password.weak')
        .then(value => {
          this.errors.password = value;
        });
      return false;
    }
    return true;
  }

  private validateConfirmPasswordMatches() {
    if (this.editUserModel.password !== this.editUserModel.passwordConfirm) {
      this.translateService.get('Passwords must match').then(value => {
        this.errors.password = value;
      });
      return false;
    }
    return true;
  }
}
