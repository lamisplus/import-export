package org.fhi360.lamis.modules.backup.web;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.fhi360.lamis.modules.backup.service.BackupService;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import javax.servlet.http.HttpServletResponse;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;

@Slf4j
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class BackupResource {
    private final BackupService backupService;

    @PostMapping("/backup/upload")
    public void upload(@RequestParam("file") MultipartFile file) throws IOException {
        backupService.upload(file.getInputStream());
    }

    @GetMapping("/backup/restore")
    public void restore() {
        backupService.restorePGSQL();
    }

    @GetMapping("/backup/backup")
    public void backup() {
        backupService.backupPGSQL(false);
    }

    @GetMapping("/backup/download")
    public void downloadBackup(HttpServletResponse response) throws IOException {
        ByteArrayOutputStream baos = backupService.downloadBackup();
        response.setHeader("Content-Type", "application/octet-stream");
        response.setHeader("Content-Length", Integer.valueOf(baos.size()).toString());
        OutputStream outputStream = response.getOutputStream();
        outputStream.write(baos.toByteArray());
        outputStream.close();
        response.flushBuffer();
    }

    @GetMapping("/backup/revert")
    public void revert() {
        backupService.revert();
    }

    @GetMapping("/backup/backup-available")
    public boolean backupAvailable() {
        return backupService.backupAvailable();
    }
}
