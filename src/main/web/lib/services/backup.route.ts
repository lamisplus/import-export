import { Routes } from '@angular/router';
import { BackupComponent } from '../components/backup.component';
import { RestoreComponent } from '../components/restore.component';


export const ROUTES: Routes = [
    {
        path: '',
        data: {
            title: 'Backup/ Restore',
            breadcrumb: 'BACKUP/ RESTORE'
        },
        children: [
            {
                path: 'backup',
                component: BackupComponent,
                data: {
                    breadcrumb: 'BACKUP'
                },
            },
            {
                path: 'restore',
                component: RestoreComponent,
                data: {
                    breadcrumb: 'RESTORE'
                },
            }
        ]
    }
];

