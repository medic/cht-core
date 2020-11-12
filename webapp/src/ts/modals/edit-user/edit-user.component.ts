import { Directive, Injectable } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';

import { MmModalAbstract } from '@mm-modals/mm-modal/mm-modal';
import { UserSettingsService } from '@mm-services/user-settings.service';

@Injectable({
  providedIn: 'root'
})
@Directive()
export class EditUserAbstract extends MmModalAbstract {

  editUserModel;

  constructor(
    private bsModalRef: BsModalRef,
    private userSettingsService: UserSettingsService,
  ) {
    super();
  }

  async ngOnInit(): Promise<void> {
    try {
      this.editUserModel = await this.determineEditUserModel();
    } catch(err) {
      console.error('Error determining user model', err);
    }
  }

  cancel() {
    this.bsModalRef.hide();
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
