import { __decorate, __param, __metadata } from 'tslib';
import { Inject, Injectable, Component, NgModule } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SERVER_API_URL_CONFIG, AppLoaderService } from '@lamis/web-core';
import { RxStompService } from '@stomp/ng2-stompjs';
import { saveAs } from 'file-saver';
import { CommonModule } from '@angular/common';
import { MatInputModule, MatIconModule, MatDividerModule, MatCardModule, MatButtonModule, MatTabsModule } from '@angular/material';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CovalentCommonModule, CovalentFileModule } from '@covalent/core';

let BackupService = class BackupService {
    constructor(http, serverUrl) {
        this.http = http;
        this.serverUrl = serverUrl;
        this.resourceUrl = '';
        this.resourceUrl = serverUrl.SERVER_API_URL + '/api/backup';
    }
    uploadFile(form) {
        return this.http.post(this.resourceUrl + '/upload', form, { 'observe': 'response' });
    }
    download() {
        return this.http.get(`${this.resourceUrl}/download`, { responseType: 'blob' });
    }
    restore() {
        return this.http.get(`${this.resourceUrl}/restore`);
    }
    revert() {
        return this.http.get(`${this.resourceUrl}/revert`);
    }
    backupAvailable() {
        return this.http.get(`${this.resourceUrl}/backup-available`);
    }
    backup() {
        return this.http.get(`${this.resourceUrl}/backup`);
    }
};
BackupService.ctorParameters = () => [
    { type: HttpClient },
    { type: undefined, decorators: [{ type: Inject, args: [SERVER_API_URL_CONFIG,] }] }
];
BackupService = __decorate([
    Injectable(),
    __param(1, Inject(SERVER_API_URL_CONFIG)),
    __metadata("design:paramtypes", [HttpClient, Object])
], BackupService);

let BackupComponent = class BackupComponent {
    constructor(backupService, stompService) {
        this.backupService = backupService;
        this.stompService = stompService;
        this.running = false;
        this.available = false;
        this.finished = false;
    }
    ngOnInit() {
        this.topicSubscription = this.stompService.watch('/topic/backup/status').subscribe((msg) => {
            this.status = msg.body + '\n' + this.status;
            if (msg.body === 'Backup completed') {
                this.running = false;
                this.available = true;
            }
        });
        this.errorSubscription = this.stompService.watch('/topic/backup/error').subscribe((msg) => {
            this.status = 'Could not backup database; an error occurred';
            this.running = false;
        });
        this.backupService.backupAvailable().subscribe((res) => this.available = res);
    }
    backup() {
        this.running = true;
        this.available = false;
        this.backupService.backup().subscribe(res => this.running = false);
    }
    download() {
        this.backupService.download().subscribe(res => {
            const file = new File([res], name + 'backup.backup', { type: 'application/octet-stream' });
            saveAs(file);
        });
    }
    ngOnDestroy() {
        this.topicSubscription.unsubscribe();
        this.errorSubscription.unsubscribe();
    }
};
BackupComponent.ctorParameters = () => [
    { type: BackupService },
    { type: RxStompService }
];
BackupComponent = __decorate([
    Component({
        selector: 'lamis-backup',
        template: "<div class=\"lamis-edit-form\">\r\n    <div class=\"lamis-edit-form-container\">\r\n        <mat-card>\r\n            <mat-card-content>\r\n                <mat-form-field *ngIf=\"!!status\">\r\n                    <textarea matInput placeholder=\"Status\" [value]=\"status\"\r\n                              rows=\"20\"\r\n                              [disabled]=\"true\"></textarea>\r\n                </mat-form-field>\r\n                <mat-divider></mat-divider>\r\n                <mat-card-actions>\r\n                    <button mat-raised-button color=\"primary\" [disabled]=\"running\"\r\n                            class=\"text-upper\"\r\n                            (click)=\"backup()\">Create New Backup\r\n                    </button>\r\n                    <button mat-button color=\"accent\" [disabled]=\"!available\" class=\"text-upper\"\r\n                            (click)=\"download()\">Download Backup\r\n                    </button>\r\n                </mat-card-actions>\r\n            </mat-card-content>\r\n        </mat-card>\r\n    </div>\r\n</div>"
    }),
    __metadata("design:paramtypes", [BackupService, RxStompService])
], BackupComponent);

let RestoreComponent = class RestoreComponent {
    constructor(backupService, stompService, loaderService) {
        this.backupService = backupService;
        this.stompService = stompService;
        this.loaderService = loaderService;
        this.submitted = false;
        this.running = false;
        this.available = false;
    }
    ngOnDestroy() {
        this.topicSubscription.unsubscribe();
        this.errorSubscription.unsubscribe();
    }
    ngOnInit() {
        this.topicSubscription = this.stompService.watch('/topic/backup/status').subscribe((msg) => {
            this.status = msg.body + '\n' + this.status;
            this.running = msg.body !== 'Restore completed';
        });
        this.errorSubscription = this.stompService.watch('/topic/backup/error').subscribe((msg) => {
            this.status = 'Could not restore database; an error occurred';
            this.running = false;
        });
        this.backupService.backupAvailable().subscribe((res) => this.available = res);
    }
    upload() {
        const formData = new FormData();
        formData.append('file', this.files);
        this.loaderService.open('Uploading file: please wait...');
        this.backupService.uploadFile(formData).subscribe(res => {
            this.loaderService.close();
            this.submitted = true;
        });
    }
    restore() {
        this.status = 'Starting restore';
        this.submitted = false;
        this.backupService.restore().subscribe();
    }
    revert() {
        this.running = true;
        this.backupService.revert().subscribe();
    }
};
RestoreComponent.ctorParameters = () => [
    { type: BackupService },
    { type: RxStompService },
    { type: AppLoaderService }
];
RestoreComponent = __decorate([
    Component({
        selector: 'lamis-restore',
        template: "<div class=\"lamis-edit-form\">\n    <div class=\"lamis-edit-form-container\">\n        <mat-card>\n            <mat-card-content>\n                <div layout=\"row\">\n                    <mat-form-field tdFileDrop\n                                    (fileDrop)=\"files = $event\"\n                                    (click)=\"fileInput.inputElement.click()\"\n                                    (keyup.enter)=\"fileInput.inputElement.click()\"\n                                    (keyup.delete)=\"fileInput.clear()\"\n                                    (keyup.backspace)=\"fileInput.clear()\"\n                                    flex>\n                        <input matInput\n                               placeholder=\"Select or drop a file\"\n                               [value]=\"files?.length ? (files?.length + ' files') : files?.name\"\n                               readonly/>\n                    </mat-form-field>\n                    <button mat-icon-button *ngIf=\"files\" (click)=\"fileInput.clear()\" (keyup.enter)=\"fileInput.clear()\">\n                        <mat-icon>cancel</mat-icon>\n                    </button>\n                    <td-file-input class=\"push-left-sm push-right-sm\" #fileInput [(ngModel)]=\"files\">\n                        <mat-icon>folder</mat-icon>\n                        <span class=\"text-upper\">Browse...</span>\n                    </td-file-input>\n                    <span>\n                <button mat-raised-button color=\"accent\" [disabled]=\"!files || running\" class=\"text-upper\"\n                        (click)=\"upload()\">Upload</button>\n            </span>\n                </div>\n                <mat-form-field *ngIf=\"!!status\">\n                    <textarea matInput placeholder=\"Status\" [value]=\"status\"\n                              rows=\"20\"\n                              [disabled]=\"true\"></textarea>\n                </mat-form-field>\n                <mat-divider></mat-divider>\n                <mat-card-actions>\n                    <button mat-button [disabled]=\"running || !available\" class=\"text-upper\"\n                    (click)=\"revert()\">Revert to Previous backup\n                    </button>\n                    <button mat-raised-button color=\"primary\" [disabled]=\"running || !submitted\" class=\"text-upper\"\n                            (click)=\"restore()\">Restore\n                    </button>\n                </mat-card-actions>\n            </mat-card-content>\n        </mat-card>\n    </div>\n</div>",
        styles: [".drop-zone{font-weight:600}.drop-zone ::ng-deep *{pointer-events:none}"]
    }),
    __metadata("design:paramtypes", [BackupService, RxStompService,
        AppLoaderService])
], RestoreComponent);

const ??0 = {
    title: 'Backup/ Restore',
    breadcrumb: 'BACKUP/ RESTORE'
}, ??1 = {
    breadcrumb: 'BACKUP'
}, ??2 = {
    breadcrumb: 'RESTORE'
};
const ROUTES = [
    {
        path: '',
        data: ??0,
        children: [
            {
                path: 'backup',
                component: BackupComponent,
                data: ??1,
            },
            {
                path: 'restore',
                component: RestoreComponent,
                data: ??2,
            }
        ]
    }
];

let BackupModule = class BackupModule {
};
BackupModule = __decorate([
    NgModule({
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
], BackupModule);

/*
 * Public API Surface of Backup Module
 */

/**
 * Generated bundle index. Do not edit.
 */

export { BackupComponent, BackupModule, BackupService, ROUTES, RestoreComponent, ??0, ??1, ??2 };
//# sourceMappingURL=lamis-backup-1.4.1.js.map
