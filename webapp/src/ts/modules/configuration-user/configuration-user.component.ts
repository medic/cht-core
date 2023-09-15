import { Component, OnInit } from '@angular/core';

import { ModalService } from '@mm-services/modal.service';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { UpdatePasswordComponent } from '@mm-modals/edit-user/update-password.component';
import { EditUserSettingsComponent } from '@mm-modals/edit-user/edit-user-settings.component';

@Component({
  templateUrl: './configuration-user.component.html'
})
export class ConfigurationUserComponent implements OnInit {

  loading: boolean;
  user;

  constructor(
    private modalService: ModalService,
    private userSettingsService: UserSettingsService,
  ) { }

  ngOnInit() {
    this.loading = true;
    this.userSettingsService.get().then(user => {
      this.loading = false;
      this.user = user;
    });
  }

  updatePassword() {
    this.modalService.show(UpdatePasswordComponent);
  }

  editSettings() {
    this.modalService.show(EditUserSettingsComponent);
  }
}
