package com.example.collabodraw.DAO;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class WhiteboardDAO {

    private final JdbcTemplate jdbcTemplate;

    public WhiteboardDAO(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public int createWhiteboard(String title, int createdBy) {
        String sql = "INSERT INTO whiteboard (title, created_by) VALUES (?, ?)";
        return jdbcTemplate.update(sql, title, createdBy);
    }

    public List<String> getWhiteboardsByUser(int userId) {
        String sql = "SELECT title FROM whiteboard WHERE created_by = ?";
        return jdbcTemplate.queryForList(sql, String.class, userId);
    }
}
