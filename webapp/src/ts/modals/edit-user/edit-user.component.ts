import { BsModalRef } from 'ngx-bootstrap/modal';

import { MmModalAbstract } from '@mm-modals/mm-modal/mm-modal';
import { UserSettingsService } from '@mm-services/user-settings.service';

export abstract class EditUserAbstract extends MmModalAbstract {
  editUserModel;

  constructor(
    bsModalRef: BsModalRef,
    private userSettingsService: UserSettingsService,
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
    return this.userSettingsService.get()
      .then((user: any) => {
        if (user) {
          return {
            id: user._id,
            username: user.name,
            fullname: user.fullname,
            email: user.email,
            phone: user.phone,
            language: { code: user.language }
          };
        } else {
          return {};
        }
      });
  }
}
