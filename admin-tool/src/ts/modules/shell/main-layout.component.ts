import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '@admin-tool-components/header/header.component';
import { SidebarComponent } from '@admin-tool-components/sidebar/sidebar.component';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, HeaderComponent, SidebarComponent],
  templateUrl: './main-layout.component.html',
})
export class MainLayoutComponent { }
