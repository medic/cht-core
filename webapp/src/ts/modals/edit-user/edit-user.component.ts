import { BsModalRef } from 'ngx-bootstrap/modal';

import { MmModalAbstract } from '@mm-modals/mm-modal/mm-modal';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { LanguageService } from '@mm-services/language.service';

export abstract class EditUserAbstract extends MmModalAbstract {
  editUserModel;

  constructor(
    bsModalRef: BsModalRef,
    private userSettingsService: UserSettingsService,
    private languageService: LanguageService,
  ) {
    super(bsModalRef);
  }

  async onInit(): Promise<void> {
    try {
      this.editUserModel = await this.determineEditUserModel();
    } catch(err) {
      console.error('Error determining user model', err);
    }
  }

  determineEditUserModel(): Promise<any> {
    return Promise
      .all<any, any>([
        this.userSettingsService.get(),
        this.languageService.get()
      ])
      .then(([ user, language ]) => {
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
      });
  }
}
