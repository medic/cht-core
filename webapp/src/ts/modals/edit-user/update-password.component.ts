import { Component } from '@angular/core';
import * as passwordTester from 'simple-password-tester';
import { MatDialogRef } from '@angular/material/dialog';

import { ModalService } from '@mm-services/modal.service';
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
export class UpdatePasswordComponent {
  static id = 'update-password-modal';
  processing = false;
  errors: any;
  editUserModel: {
    username?;
    currentPassword?;
    password?;
    passwordConfirm?;
  } = {};

  constructor(
    private userSettingsService: UserSettingsService,
    private updatePasswordService: UpdatePasswordService,
    private userLoginService: UserLoginService,
    private translateService:TranslateService,
    private modalService: ModalService,
    private matDialogRef: MatDialogRef<UpdatePasswordComponent>,
  ) { }

  async updatePassword() {
    this.errors = {};
    this.processing = true;
    if (!await this.validatePasswordFields()) {
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
          this.close();
          this.modalService.show(ConfirmPasswordUpdatedComponent);
        } else {
          window.location.reload();
        }
      }
    } catch(error) {
      if (error.status === 0) { // Offline status
        const message = await this.translateService.get('online.action.message');
        await this.setError(ErrorType.SUBMIT, message, error);
        return;
      }
      if (error.status === 401) {
        const message = await this.translateService.get('password.incorrect');
        await this.setError(ErrorType.CURRENT_PASSWORD, message, error);
        return;
      }
      await this.setError(ErrorType.SUBMIT, 'Error updating user', error);
    }
  }

  private setError(type: ErrorType, message: string, error?: Record<string, any>) {
    this.errors[type] = message;
    console.error(message, error);
    this.processing = false;
  }

  close() {
    this.processing = false;
    this.matDialogRef.close();
  }

  private async validatePasswordFields() {
    return await this.validateRequired('password', 'Password', ErrorType.PASSWORD) &&
      await this.validateRequired('currentPassword', 'Current Password', ErrorType.CURRENT_PASSWORD) &&
      await this.validatePasswordStrength() &&
      await this.validateConfirmPasswordMatches();
  }

  private async validateRequired(fieldName, fieldDisplayName, errorType) {
    if (this.editUserModel[fieldName]) {
      return true;
    }
    try {
      const value = await this.translateService.fieldIsRequired(fieldDisplayName);
      await this.setError(errorType, value);
    } catch (err) {
      console.error(`Error translating field display name '${fieldDisplayName}'`, err);
    }
    return false;
  }

  private async validatePasswordStrength() {
    const password = this.editUserModel.password || '';
    if (password.length < PASSWORD_MINIMUM_LENGTH) {
      const value = await this.translateService.get('password.length.minimum', { minimum: PASSWORD_MINIMUM_LENGTH });
      await this.setError(ErrorType.PASSWORD, value);
      return false;
    }
    if (passwordTester(password) < PASSWORD_MINIMUM_SCORE) {
      const value = await this.translateService.get('password.weak');
      await this.setError(ErrorType.PASSWORD, value);
      return false;
    }
    return true;
  }

  private async validateConfirmPasswordMatches() {
    if (this.editUserModel.password !== this.editUserModel.passwordConfirm) {
      const value = await this.translateService.get('Passwords must match');
      await this.setError(ErrorType.PASSWORD, value);
      return false;
    }
    return true;
  }
}

enum ErrorType {
  PASSWORD = 'password',
  CURRENT_PASSWORD = 'currentPassword',
  SUBMIT = 'submit',
}
