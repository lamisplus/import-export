import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import {
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatIconModule,
    MatInputModule,
    MatTabsModule
} from '@angular/material';
import { RouterModule } from '@angular/router';
import { BackupComponent } from './components/backup.component';
import { BackupService } from "./services/backup.service";
import { ROUTES } from "./services/backup.route";
import { FormsModule } from "@angular/forms";
import { RestoreComponent } from "./components/restore.component";
import { CovalentCommonModule, CovalentFileModule } from "@covalent/core";

@NgModule({
    declarations: [
        BackupComponent,
        RestoreComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        MatInputModule,
        MatIconModule,
        MatDividerModule,
        MatCardModule,
        MatButtonModule,
        MatTabsModule,
        RouterModule.forChild(ROUTES),
        CovalentCommonModule,
        CovalentFileModule
    ],
    exports: [
        BackupComponent,
        RestoreComponent
    ],
    providers: [
        BackupService
    ]
})
export class BackupModule {
}
