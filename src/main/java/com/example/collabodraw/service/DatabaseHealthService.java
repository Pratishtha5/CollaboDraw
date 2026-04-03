package com.example.collabodraw.service;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.SQLException;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
public class DatabaseHealthService {
    private static final Logger log = LoggerFactory.getLogger(DatabaseHealthService.class);

    private final JdbcTemplate jdbcTemplate;
    private final AtomicBoolean available = new AtomicBoolean(false);
    private volatile String lastStatusMessage = "Database status not checked yet.";
    private volatile String lastFailureReason = "";

    public DatabaseHealthService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostConstruct
    public void initialize() {
        refresh();
    }

    public boolean refresh() {
        try {
            jdbcTemplate.execute("SELECT 1");
            available.set(true);
            lastStatusMessage = "Database connection verified.";
            lastFailureReason = "";
            log.info(lastStatusMessage);
            return true;
        } catch (Exception e) {
            available.set(false);
            lastFailureReason = classifyFailure(e);
            lastStatusMessage = "Database is currently unavailable: " + lastFailureReason;
            log.warn("{} (root cause: {})", lastStatusMessage, e.toString());
            return false;
        }
    }

    public boolean isAvailable() {
        return available.get();
    }

    public String getLastStatusMessage() {
        return lastStatusMessage;
    }

    public String getLastFailureReason() {
        return lastFailureReason;
    }

    private String classifyFailure(Throwable error) {
        Throwable root = error;
        while (root.getCause() != null && root.getCause() != root) {
            root = root.getCause();
        }

        String message = root.getMessage();
        if (message == null || message.isBlank()) {
            message = error.getMessage();
        }
        if (message == null || message.isBlank()) {
            return "unknown JDBC failure";
        }

        String normalized = message.toLowerCase(Locale.ROOT);
        if (normalized.contains("access denied")) {
            return "invalid database username or password";
        }
        if (normalized.contains("unknown database")) {
            return "the configured database name does not exist";
        }
        if (normalized.contains("communications link failure") || normalized.contains("connection refused")) {
            return "the Aiven endpoint is unreachable from this machine";
        }
        if (normalized.contains("socket timeout") || normalized.contains("timed out")) {
            return "the database host is not responding in time";
        }
        if (root instanceof SQLException sqlException && sqlException.getSQLState() != null) {
            return "jdbc/sqlstate " + sqlException.getSQLState() + ": " + message;
        }
        return message;
    }
}