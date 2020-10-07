import {Component, Input} from "@angular/core";
import {EditUserAbstract} from "./edit-user.component";
import {BsModalRef} from "ngx-bootstrap/modal";
import {UserSettingsService} from "@mm-services/user-settings.service";
import {UpdateUserService} from "@mm-services/update-user.service";
import {LanguagesService} from "@mm-services/languages.service";

@Component({
  selector: 'update-password',
  templateUrl: './edit-user-settings.component.html'
})
export class EditUserSettingsComponent extends EditUserAbstract {

  @Input() editUserModel: {
    id?,
    fullname?,
    username?,
    email?,
    place?,
    contact?,
    phone?,
    language?: { code? }
  } = {
    language: {}
  };

  errors: any = {};
  enabledLocales: any = [];

  constructor(
    bsModalRef: BsModalRef,
    userSettingsService: UserSettingsService,
    private updateUserService: UpdateUserService,
    private languagesService: LanguagesService,
  ) {
    super(bsModalRef, userSettingsService);
  }

  async ngOnInit(): Promise<void> {
    await super.ngOnInit();
    this.enabledLocales = await this.languagesService.get();
  }

  editUserSettings(): Promise<void> {
    this.setProcessing();
    this.errors = {};
    this.computeFields();

    return this.changedUpdates(this.editUserModel).then((updates: any) => {
      Promise.resolve().then(() => {
        if (this.haveUpdates(updates)) {
          return this.updateUserService.update(
            this.editUserModel.username,
            updates
          ).toPromise();
        }
      })
        .then(() => {
          if (updates.language) {
            // editing current user, so update language
            // TODO once SetLanguage migrated refactor the commented code below
            //SetLanguage(updates.language);
          }
          this.setFinished();
          this.cancel();
        })
        .catch((err) => {
          this.setError(err, 'Error updating user');
        });
    });
  }

  listTrackBy(index, locale) {
    return locale.code;
  }

  private computeFields() {
    if (document.querySelector('#edit-user-profile')) {
      this.editUserModel.place = document.querySelector('#edit-user-profile [name=facilitySelect]')['value'];
      this.editUserModel.contact = document.querySelector('#edit-user-profile [name=contactSelect]')['value'];
    }
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
