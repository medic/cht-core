import { Component, EventEmitter, OnInit, Output, Input } from '@angular/core';

import { AuthService } from '@mm-services/auth.service';
import { ResponsiveService } from '@mm-services/responsive.service';
import { OLD_ACTION_BAR_PERMISSION } from '@mm-components/actionbar/actionbar.component';
import { SessionService } from '@mm-services/session.service';

@Component({
  selector: 'mm-messages-more-menu',
  templateUrl: './messages-more-menu.component.html'
})
export class MessagesMoreMenuComponent implements OnInit {
  @Input() conversations;
  @Output() exportMessages: EventEmitter<any> = new EventEmitter();

  private hasExportPermission = false;
  private isOnlineOnly;

  useOldActionBar = false;

  constructor(
    private authService: AuthService,
    private responsiveService: ResponsiveService,
    private sessionService: SessionService,
  ) { }

  ngOnInit(): void {
    this.checkPermissions();
    this.isOnlineOnly = this.authService.online(true);
  }

  private async checkPermissions() {
    this.hasExportPermission = await this.authService.any([[ 'can_export_all' ], [ 'can_export_messages' ]]);
    this.useOldActionBar = !this.sessionService.isDbAdmin() && await this.authService.has(OLD_ACTION_BAR_PERMISSION);
  }

  displayExportOption() {
    return this.isOnlineOnly && this.hasExportPermission && !this.responsiveService.isMobile();
  }
}
