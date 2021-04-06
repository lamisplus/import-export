import { Component, OnDestroy, OnInit } from '@angular/core';
import { BackupService } from "../services/backup.service";
import { RxStompService } from "@stomp/ng2-stompjs";
import { Message } from '@stomp/stompjs';
import { Subscription } from "rxjs";
import { saveAs } from 'file-saver';

export interface Facility {
    id: number;
    name: string;
    selected: boolean;
}

@Component({
    selector: 'lamis-backup',
    templateUrl: './backup.component.html'
})
export class BackupComponent implements OnInit, OnDestroy {
    private topicSubscription: Subscription;
    private errorSubscription: Subscription;
    running = false;
    available: boolean = false;
    status: any;
    finished = false;

    constructor(private backupService: BackupService, private stompService: RxStompService) {
    }

    ngOnInit() {
        this.topicSubscription = this.stompService.watch('/topic/backup/status').subscribe((msg: Message) => {
            this.status = msg.body + '\n' + this.status;
            if(msg.body === 'Backup completed'){
                this.running = false;
                this.available = true;
            }
        });
        this.errorSubscription = this.stompService.watch('/topic/backup/error').subscribe((msg: Message) => {
            this.status = 'Could not backup database; an error occurred';
            this.running = false;
        });

        this.backupService.backupAvailable().subscribe((res: boolean) => this.available = res)
    }

    backup() {
        this.running = true;
        this.available = false;
        this.backupService.backup().subscribe(res => this.running = false)
    }

    download() {
        this.backupService.download().subscribe(res => {
            const file = new File([res], name + 'backup.backup', {type: 'application/octet-stream'});
            saveAs(file);
        });
    }


    ngOnDestroy(): void {
        this.topicSubscription.unsubscribe();
        this.errorSubscription.unsubscribe();
    }
}
