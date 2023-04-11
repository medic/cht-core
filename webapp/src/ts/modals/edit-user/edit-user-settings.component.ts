import { Component, Input, OnInit } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';

import { MmModalAbstract } from '@mm-modals/mm-modal/mm-modal';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { LanguagesService } from '@mm-services/languages.service';
import { SetLanguageService, LanguageService } from '@mm-services/language.service';

@Component({
  selector: 'update-password',
  templateUrl: './edit-user-settings.component.html'
})
export class EditUserSettingsComponent extends MmModalAbstract implements OnInit {

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

  static id = 'edit-user-settings-modal';
  errors: any = {};
  enabledLocales: any = [];

  constructor(
    bsModalRef: BsModalRef,
    private userSettingsService: UserSettingsService,
    private languageService: LanguageService,
    private languagesService: LanguagesService,
    private setLanguageService: SetLanguageService,
  ) {
    super(bsModalRef);
  }

  async ngOnInit(): Promise<void> {
    try {
      this.editUserModel = await this.determineEditUserModel();
    } catch(err) {
      console.error('Error determining user model', err);
    }
    this.enabledLocales = await this.languagesService.get();
  }

  async determineEditUserModel(): Promise<any> {
    const [ user, language ] = await Promise.all<any>([
      this.userSettingsService.get(),
      this.languageService.get()
    ]);
    if (user) {
      return {
        id: user._id,
        username: user.name,
        fullname: user.fullname,
        email: user.email,
        phone: user.phone,
        language: { code: language }
      };
    } else {
      return {};
    }
  }

  async editUserSettings(): Promise<void> {
    this.setProcessing();
    this.errors = {};

    try {
      const updates:any = await this.changedUpdates(this.editUserModel);
      const userSettings = await this.userSettingsService.get();
      let hasUpdates = false;
      Object.keys(updates).forEach(key => {
        hasUpdates = true;
        userSettings[key] = updates[key];
      });
      if (hasUpdates) {
        await this.userSettingsService.put(userSettings);
      }
      if (updates.language) {
        await this.setLanguageService.set(updates.language);
      }
      this.setFinished();
      this.close();
    } catch (e) {
      this.setError(e, 'Error updating user');
    }
  }

  listTrackBy(index, locale) {
    return locale.code;
  }

  private async changedUpdates(model) {
    const existingModel = await this.determineEditUserModel();
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
  }
}
