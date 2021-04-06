import { Component, OnDestroy, OnInit } from "@angular/core";
import { BackupService } from "../services/backup.service";
import { RxStompService } from "@stomp/ng2-stompjs";
import { AppLoaderService } from "@lamis/web-core";
import { Subscription } from "rxjs";
import { Message } from "@stomp/stompjs";

@Component({
    selector: 'lamis-restore',
    templateUrl: './restore.component.html',
    styleUrls: ['./restore.component.scss']
})
export class RestoreComponent implements OnInit, OnDestroy {
    files: any;
    submitted = false;
    running = false;
    available: boolean = false;
    status: any;
    topicSubscription: Subscription;
    errorSubscription: Subscription;

    constructor(private backupService: BackupService, private stompService: RxStompService,
                private loaderService: AppLoaderService) {
    }

    ngOnDestroy(): void {
        this.topicSubscription.unsubscribe();
        this.errorSubscription.unsubscribe();
    }

    ngOnInit(): void {
        this.topicSubscription = this.stompService.watch('/topic/backup/status').subscribe((msg: Message) => {
            this.status = msg.body + '\n' + this.status;
            this.running = msg.body !== 'Restore completed';
        });
        this.errorSubscription = this.stompService.watch('/topic/backup/error').subscribe((msg: Message) => {
            this.status = 'Could not restore database; an error occurred';
            this.running = false;
        });
        this.backupService.backupAvailable().subscribe((res: boolean) => this.available = res)
    }

    upload() {
        const formData = new FormData();
        formData.append('file', this.files);
        this.loaderService.open('Uploading file: please wait...');
        this.backupService.uploadFile(formData).subscribe(res=> {
            this.loaderService.close();
            this.submitted = true;
        })
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

}
