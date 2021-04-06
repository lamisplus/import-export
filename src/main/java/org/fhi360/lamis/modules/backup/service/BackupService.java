package org.fhi360.lamis.modules.backup.service;

import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.io.FileUtils;
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.SystemUtils;
import org.lamisplus.modules.base.config.ApplicationProperties;
import org.lamisplus.modules.base.web.rest.JobSchedulerResource;
import org.lamisplus.modules.base.web.vm.ScheduleRequest;
import org.springframework.boot.autoconfigure.jdbc.DataSourceProperties;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import java.io.*;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.time.LocalDateTime;
import java.util.Date;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@RequiredArgsConstructor
@Service
public class BackupService {
    private static final String BASE_DIR = "/backup/";
    private static final String TEMP_DIR = System.getProperty("java.io.tmpdir");
    private final JdbcTemplate jdbcTemplate;
    private final ApplicationProperties applicationProperties;
    private final DataSourceProperties databaseProperties;
    private final SimpMessageSendingOperations messagingTemplate;
    private final JobSchedulerResource jobSchedulerResource;

    private String username;
    private String password;
    private String database;
    private String port = "5432";
    private String host = "127.0.0.1";

    public void upload(InputStream inputStream) throws IOException {
        String directory = applicationProperties.getTempDir() + BASE_DIR;
        new File(directory).mkdir();
        IOUtils.copy(inputStream, new FileOutputStream(directory + "backup.sql"));
    }

    public ByteArrayOutputStream downloadBackup() throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        SimpleDateFormat df = new SimpleDateFormat("yyyyMMddHH");
        SimpleDateFormat alternateDf = new SimpleDateFormat("yyyyMMdd");
        String directory = applicationProperties.getTempDir() + BASE_DIR;
        String file = listFilesUsingDirectoryStream(directory).stream()
                .filter(f -> f.endsWith(".sql") && !f.startsWith("backup"))
                .sorted((b1, b2) -> {
                    Date date1 = new Date();
                    Date date2 = new Date();
                    try {
                        date1 = df.parse(b1.replace(".sql", ""));
                    } catch (ParseException e) {
                        try {
                            date1 = alternateDf.parse(b1.replace(".sql", ""));
                        } catch (ParseException ex) {
                            ex.printStackTrace();
                        }
                    }
                    try {
                        date2 = df.parse(b2.replace(".sql", ""));
                    } catch (ParseException e) {
                        try {
                            date2 = alternateDf.parse(b2.replace(".sql", ""));
                        } catch (ParseException ex) {
                            ex.printStackTrace();
                        }
                    }
                    return date2.compareTo(date1);
                })
                .limit(1)
                .findFirst().get();
        IOUtils.copy(new FileInputStream(directory + file), baos);
        return baos;
    }

    public void backupPGSQL(boolean restore) {
        try {
            messagingTemplate.convertAndSend("/topic/backup/status", "Backup started");
            //Path to the place we store our backup
            String directory = applicationProperties.getTempDir() + BASE_DIR;
            new File(directory).mkdir();
            //PostgreSQL variables
            String IP = host;
            String user = username;
            String dbase = database;
            String password = this.password;
            Process p;
            ProcessBuilder pb;
            //We build a string with today's date (This will be the backup's filename)

            SimpleDateFormat df = new SimpleDateFormat("yyyyMMddHH");
            StringBuilder date = new StringBuilder();
            date.append(df.format(new Date()));
            File file = new File(directory);
            /*
            Files.list(file.toPath())
                    .filter(path -> !(path.toString().contains("backup") || path.toString().contains("restore")))
                    .forEach(path -> {
                        try {
                            Files.delete(path);
                        } catch (IOException e) {
                            e.printStackTrace();
                        }
                    });*/
            // We test if the path to our programs exists
            if (file.exists()) {
                // We then test if the file we're going to generate exist too. If so we will delete it
                LOG.info("Creating dump");
                String exec = "pg_dump";
                if (SystemUtils.IS_OS_WINDOWS) {
                    exec = TEMP_DIR + File.separator + exec + ".exe";
                }
                String buffer = directory + date.toString() + ".sql";
                if (restore) {
                    buffer = "restore.sql";
                }
                pb = new ProcessBuilder(exec, "-f", buffer,
                        "-F", "c", "-Z", "9", "-b", "-v", "-c", "-C", "-p", port, "-h", IP, "-U", user, dbase);
                pb.environment().put("PGPASSWORD", password);
                pb.redirectErrorStream(true);
                p = pb.start();
                try {
                    InputStream is = p.getInputStream();
                    InputStreamReader isr = new InputStreamReader(is);
                    BufferedReader br = new BufferedReader(isr);
                    String ll;
                    while ((ll = br.readLine()) != null) {
                        messagingTemplate.convertAndSend("/topic/backup/status", ll);
                    }
                } catch (IOException e) {
                    e.printStackTrace();
                    messagingTemplate.convertAndSend("/topic/backup/error", e.getMessage());
                }
                messagingTemplate.convertAndSend("/topic/backup/status", "Backup completed");
            }
        } catch (IOException x) {
            x.printStackTrace();
            messagingTemplate.convertAndSend("/topic/backup/error", x.getMessage());
        }
    }

    public void restorePGSQL() {
        backupPGSQL(true);
        try {
            messagingTemplate.convertAndSend("/topic/backup/status", "Restore started");
            try {
                jdbcTemplate.update("drop schema if exists public cascade");
                jdbcTemplate.update("create schema public");
            } catch (Exception e) {
                e.printStackTrace();
            }
            String directory = applicationProperties.getTempDir() + BASE_DIR;
            //PostgreSQL variables
            String IP = host;
            String user = username;
            String password = this.password;
            String dbname = database;
            Process p;
            ProcessBuilder pb;
            String exec = "pg_restore";
            if (SystemUtils.IS_OS_WINDOWS) {
                exec = TEMP_DIR + File.separator + exec + ".exe";
            }
            pb = new ProcessBuilder(exec,
                    "-F", "c", "-c", "-C", "-v", "-p", port, "-h", IP, "-U", user, "-d", dbname, directory + "backup.sql"
                    //PostgreSQL variables
            );
            pb.environment().put("PGPASSWORD", password);
            pb.redirectErrorStream(true);
            p = pb.start();
            try {
                InputStream is = p.getInputStream();
                InputStreamReader isr = new InputStreamReader(is);
                BufferedReader br = new BufferedReader(isr);
                String ll;
                while ((ll = br.readLine()) != null) {
                    messagingTemplate.convertAndSend("/topic/backup/status", ll);
                }
            } catch (IOException e) {
                messagingTemplate.convertAndSend("/topic/backup/error", e.getMessage());
            }
            messagingTemplate.convertAndSend("/topic/backup/status", "");
            messagingTemplate.convertAndSend("/topic/backup/status", "Restore completed");
        } catch (IOException x) {
            messagingTemplate.convertAndSend("/topic/backup/error", x.getMessage());
        }
    }

    @SneakyThrows
    public void revert() {
        String directory = applicationProperties.getTempDir() + BASE_DIR;
        Optional<String> lastState = listFilesUsingDirectoryStream(directory).stream()
                .filter(f -> f.contains("restore.sql"))
                .findFirst();
        lastState.ifPresent(n -> {
            try {
                upload(new FileInputStream(directory + n));
                restorePGSQL();
            } catch (IOException ignored) {
            }
        });
    }

    @SneakyThrows
    public boolean backupAvailable() {
        String directory = applicationProperties.getTempDir() + BASE_DIR;
        return listFilesUsingDirectoryStream(directory).stream()
                .anyMatch(f -> f.endsWith(".sql") && !f.startsWith("backup"));
    }

    private Set<String> listFilesUsingDirectoryStream(String dir) throws IOException {
        Set<String> fileList = new HashSet<>();
        try (DirectoryStream<Path> stream = Files.newDirectoryStream(Paths.get(dir))) {
            for (Path path : stream) {
                if (!Files.isDirectory(path)) {
                    fileList.add(path.getFileName().toString());
                }
            }
        }
        return fileList;
    }

    @SneakyThrows
    protected void cleanupBackup() {
        SimpleDateFormat df = new SimpleDateFormat("yyyyMMddHH");
        SimpleDateFormat alternateDf = new SimpleDateFormat("yyyyMMdd");
        String directory = applicationProperties.getTempDir() + BASE_DIR;
        listFilesUsingDirectoryStream(directory).stream()
                .filter(f -> f.endsWith(".sql") && !f.startsWith("backup"))
                .forEach(f -> {
                    try {
                        Date date;
                        try {
                            date = df.parse(f.replace(".sql", ""));
                        } catch (ParseException e) {
                            date = alternateDf.parse(f.replace(".sql", ""));
                        }
                        if (LocalDateTime.now().minusDays(5).isAfter(convertToLocalDateTimeViaSqlTimestamp(date))) {
                            FileUtils.deleteQuietly(new File(directory + f));
                        }

                        if (LocalDateTime.now().minusHours(2).isAfter(convertToLocalDateTimeViaSqlTimestamp(date)) &&
                                LocalDateTime.now().toLocalDate().equals(convertToLocalDateTimeViaSqlTimestamp(date).toLocalDate())) {
                            FileUtils.deleteQuietly(new File(directory + f));
                        }
                    } catch (ParseException e) {
                        e.printStackTrace();
                    }
                });
    }

    private LocalDateTime convertToLocalDateTimeViaSqlTimestamp(Date dateToConvert) {
        return new java.sql.Timestamp(
                dateToConvert.getTime()).toLocalDateTime();
    }

    @SneakyThrows
    @PostConstruct
    public void init() {
        String directory = applicationProperties.getTempDir() + BASE_DIR;
        new File(directory).mkdir();

        String jobClass = "org.fhi360.lamis.modules.backup.service.BackupJob";
        boolean scheduled = jobSchedulerResource.listJobClasses()
                .stream()
                .anyMatch(c -> c.equals(jobClass));
        if (!scheduled) {
            ScheduleRequest request = new ScheduleRequest();
            request.setJobClass(jobClass);
            request.setCronExpression("0 0/30 * * * ?");
            jobSchedulerResource.scheduleJob(request);
        }

        password = databaseProperties.getPassword();
        username = databaseProperties.getUsername();
        String url = databaseProperties.getUrl();
        String regex = ".*://(.*?)(:.*)?/(\\w*)(.*)?";
        Pattern pattern = Pattern.compile(regex);
        Matcher matcher = pattern.matcher(url);

        if (matcher.matches()) {
            host = matcher.group(1);
            port = StringUtils.defaultIfBlank(matcher.group(2), "5432").replace(":", "");
            database = matcher.group(3);
        }
    }

    @Scheduled(cron = "0 0/30 * * * ?")
    public void backupCleanup() {
        backupPGSQL(false);
        cleanupBackup();
    }

    static {
        String[] files = {"pg_restore", "pg_dump", "pg_dump.exe", "pg_restore.exe", "libcrypto-1_1.dll", "libpq.dll", "libssl-1_1.dll", "zlib.dll"};
        for (String file : files) {
            try (InputStream is = BackupService.class.getClassLoader().getResourceAsStream(file)) {
                FileOutputStream fos = new FileOutputStream(new File(TEMP_DIR + File.separator + file));
                IOUtils.copy(is, fos);
                fos.close();
            } catch (IOException e) {
                e.printStackTrace();
            }
        }
    }
}
