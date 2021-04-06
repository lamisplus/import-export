import { Inject, Injectable } from "@angular/core";
import { HttpClient, HttpResponse } from "@angular/common/http";
import { SERVER_API_URL_CONFIG, ServerApiUrlConfig } from "@lamis/web-core";
import { Observable } from "rxjs";

@Injectable()
export class BackupService {
    public resourceUrl = '';

    constructor(private http: HttpClient, @Inject(SERVER_API_URL_CONFIG) private serverUrl: ServerApiUrlConfig) {
        this.resourceUrl = serverUrl.SERVER_API_URL + '/api/backup';
    }


    public uploadFile(form): Observable<HttpResponse<any>> {
        return this.http.post<any>(this.resourceUrl + '/upload', form, {'observe': 'response'})
    }

    download(): Observable<Blob> {
        return this.http.get(`${this.resourceUrl}/download`, {responseType: 'blob'})
    }

    restore() {
        return this.http.get<string[]>(`${this.resourceUrl}/restore`)
    }

    revert() {
        return this.http.get<string[]>(`${this.resourceUrl}/revert`)
    }

    backupAvailable() {
        return this.http.get<boolean>(`${this.resourceUrl}/backup-available`)
    }

    backup() {
        return this.http.get(`${this.resourceUrl}/backup`)
    }
}