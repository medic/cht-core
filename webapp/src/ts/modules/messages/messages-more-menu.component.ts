import { Component, EventEmitter, OnInit, Output, Input } from '@angular/core';

import { AuthService } from '@mm-services/auth.service';
import { ResponsiveService } from '@mm-services/responsive.service';

@Component({
  selector: 'mm-messages-more-menu',
  templateUrl: './messages-more-menu.component.html'
})
export class MessagesMoreMenuComponent implements OnInit {
  @Input() conversations;
  @Output() exportMessages: EventEmitter<any> = new EventEmitter();

  private hasExportPermission = false;
  private isOnlineOnly;

  constructor(
    private authService: AuthService,
    private responsiveService: ResponsiveService,
  ) { }

  ngOnInit(): void {
    this.checkPermissions();
    this.isOnlineOnly = this.authService.online(true);
  }

  private async checkPermissions() {
    this.hasExportPermission = await this.authService.any([[ 'can_export_all' ], [ 'can_export_messages' ]]);
  }

  displayExportOption() {
    return this.isOnlineOnly && this.hasExportPermission && !this.responsiveService.isMobile();
  }
}
