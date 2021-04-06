package org.fhi360.lamis.modules.backup.service;

import lombok.extern.slf4j.Slf4j;
import org.lamisplus.modules.base.config.ContextProvider;
import org.quartz.Job;
import org.quartz.JobExecutionContext;
import org.quartz.JobExecutionException;

@Slf4j
public class BackupJob implements Job {
    @Override
    public void execute(JobExecutionContext context) throws JobExecutionException {
        LOG.debug("Running backup job...");
        BackupService backupService = ContextProvider.getBean(BackupService.class);
        backupService.backupPGSQL(false);
        backupService.cleanupBackup();
    }
}
