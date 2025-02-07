import { Component, OnInit } from '@angular/core';

import { ModalService } from '@mm-services/modal.service';
import { UserSettingsService } from '@mm-services/user-settings.service';
import { UpdatePasswordComponent } from '@mm-modals/edit-user/update-password.component';
import { EditUserSettingsComponent } from '@mm-modals/edit-user/edit-user-settings.component';
import { SessionService } from '@mm-services/session.service';
import { ToolBarComponent } from '../../components/tool-bar/tool-bar.component';
import { NgIf } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  templateUrl: './configuration-user.component.html',
  standalone: true,
  imports: [ToolBarComponent, NgIf, TranslatePipe]
})
export class ConfigurationUserComponent implements OnInit {

  loading?: boolean;
  canUpdatePassword?: boolean;

  constructor(
    private modalService: ModalService,
    private sessionService: SessionService,
    private userSettingsService: UserSettingsService,
  ) { }

  async ngOnInit() {
    this.loading = true;
    const user:any = await this.userSettingsService.get();
    this.canUpdatePassword = !user.token_login && !this.sessionService.isAdmin();
    this.loading = false;
  }

  updatePassword() {
    this.modalService.show(UpdatePasswordComponent);
  }

  editSettings() {
    this.modalService.show(EditUserSettingsComponent);
  }
}
