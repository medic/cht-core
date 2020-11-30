import { Component, Input, OnInit } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';

import { EditUserAbstract } from '@mm-modals/edit-user/edit-user.component';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { UpdateUserService } from '@mm-services/update-user.service';
import { LanguagesService } from '@mm-services/languages.service';
import { SetLanguageService } from '@mm-services/language.service';

@Component({
  selector: 'update-password',
  templateUrl: './edit-user-settings.component.html'
})
export class EditUserSettingsComponent extends EditUserAbstract implements OnInit {

  @Input() editUserModel: {
    id?;
    fullname?;
    username?;
    email?;
    phone?;
    language?: { code? };
  } = {
    language: {}
  };

  static id = 'edit-user-settings';
  errors: any = {};
  enabledLocales: any = [];

  constructor(
    bsModalRef: BsModalRef,
    userSettingsService: UserSettingsService,
    private updateUserService: UpdateUserService,
    private languagesService: LanguagesService,
    private setLanguageService: SetLanguageService,
  ) {
    super(bsModalRef, userSettingsService);
  }

  async ngOnInit(): Promise<void> {
    await super.onInit();
    this.enabledLocales = await this.languagesService.get();
  }

  editUserSettings(): Promise<void> {
    this.setProcessing();
    this.errors = {};

    return this.changedUpdates(this.editUserModel)
      .then((updates: any) => {
        Promise
          .resolve()
          .then(() => {
            if (this.haveUpdates(updates)) {
              return this.updateUserService.update(
                this.editUserModel.username,
                updates
              );
            }
          })
          .then(() => {
            if (updates.language) {
              this.setLanguageService.set(updates.language);
            }
            this.setFinished();
            this.close();
          })
          .catch((err) => {
            this.setError(err, 'Error updating user');
          });
      });
  }

  listTrackBy(index, locale) {
    return locale.code;
  }

  private haveUpdates(updates) {
    return Object.keys(updates).length;
  }

  private changedUpdates(model) {
    return this.determineEditUserModel()
      .then((existingModel) => {
        const updates = {};
        Object.keys(model)
          .filter((k) => {
            if (k === 'id') {
              return false;
            }
            if (k === 'language') {
              return existingModel[k].code !== (model[k] && model[k].code);
            }
            if (k === 'password') {
              return model[k] && model[k] !== '';
            }
            if (['currentPassword', 'passwordConfirm', 'facilitySelect', 'contactSelect'].indexOf(k) !== -1) {
              // We don't want to return these 'meta' fields
              return false;
            }

            return existingModel[k] !== model[k];
          })
          .forEach((k) => {
            if (k === 'language') {
              updates[k] = model[k].code;
            } else {
              updates[k] = model[k];
            }
          });

        return updates;
      });
  }
}
