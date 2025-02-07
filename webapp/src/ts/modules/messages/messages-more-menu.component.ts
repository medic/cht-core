import { Component, EventEmitter, OnInit, Output, Input } from '@angular/core';

import { AuthService } from '@mm-services/auth.service';
import { ResponsiveService } from '@mm-services/responsive.service';
import { NgIf } from '@angular/common';
import { MatIconButton } from '@angular/material/button';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'mm-messages-more-menu',
    templateUrl: './messages-more-menu.component.html',
    standalone: true,
    imports: [NgIf, MatIconButton, MatMenuTrigger, MatIcon, MatMenu, MatMenuItem, TranslatePipe]
})
export class MessagesMoreMenuComponent implements OnInit {
  @Input() conversations;
  @Output() exportMessages: EventEmitter<any> = new EventEmitter();

  private hasExportPermission = false;
  private isOnlineOnly?: boolean;

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
