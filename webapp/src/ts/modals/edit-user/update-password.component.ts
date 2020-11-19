const passwordTester = require('simple-password-tester');
import { Component, OnInit } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { TranslateService } from '@ngx-translate/core';

import { UserSettingsService } from '@mm-services/user-settings.service';
import { UpdateUserService } from '@mm-services/update-user.service';
import { EditUserAbstract } from '@mm-modals/edit-user/edit-user.component';

const PASSWORD_MINIMUM_LENGTH = 8;
const PASSWORD_MINIMUM_SCORE = 50;


@Component({
  selector: 'update-password',
  templateUrl: './update-password.component.html'
})
export class UpdatePasswordComponent extends EditUserAbstract implements OnInit {

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

  static id = 'update-password';

  constructor(
    bsModalRef: BsModalRef,
    userSettingsService: UserSettingsService,
    private translateService: TranslateService,
    private updateUserService: UpdateUserService,
  ) {
    super(bsModalRef, userSettingsService);
  }

  async ngOnInit(): Promise<void> {
    await super.onInit();
  }

  updatePassword() {
    this.errors = {};
    this.setProcessing();
    if (this.validatePasswordFields()) {
      const updates = { password: this.editUserModel.password };
      const username = this.editUserModel.username;
      this.updateUserService.update(username, updates, username, this.editUserModel.currentPassword)
        .then(() => {
          this.setFinished();
          this.windowReload();
        })
        .catch(err => {
          if (err.status === 0) { //Offline Status
            this.translateService.get('online.action.message').toPromise().then(value => {
              this.errors.currentPassword = value;
              this.setError(err, value);
            });
          } else if (err.status === 401) {
            this.translateService.get('password.incorrect').toPromise().then(value => {
              this.errors.currentPassword = value;
              this.setError(err, value);
            });
          } else {
            this.setError(err, 'Error updating user');
          }
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
        .get('field is required', { field: fieldName })
        .toPromise()
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
      this.translateService.get('password.length.minimum', { minimum: PASSWORD_MINIMUM_LENGTH })
        .toPromise()
        .then((value) => {
          this.errors.password = value;
        });
      return false;
    }
    if (passwordTester(password) < PASSWORD_MINIMUM_SCORE) {
      this.translateService.get('password.weak').toPromise().then(value => {
        this.errors.password = value;
      });
      return false;
    }
    return true;
  }

  private validateConfirmPasswordMatches() {
    if (this.editUserModel.password !== this.editUserModel.passwordConfirm) {
      this.translateService.get('Passwords must match').toPromise().then(value => {
        this.errors.password = value;
      });
      return false;
    }
    return true;
  }
}
