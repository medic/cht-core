import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

import { AuthDirective } from '@mm-directives/auth.directive';

@NgModule({
    imports: [
        CommonModule,
        TranslateModule,
        AuthDirective,
    ],
    exports: [
        AuthDirective,
    ]
})
export class DirectivesModule { }
