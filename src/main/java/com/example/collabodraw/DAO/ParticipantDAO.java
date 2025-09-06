package com.example.collabodraw.DAO;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class ParticipantDAO {

    private final JdbcTemplate jdbcTemplate;

    public ParticipantDAO(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public int addParticipant(int userId, int whiteboardId) {
        String sql = "INSERT INTO participants (user_id, whiteboard_id) VALUES (?, ?)";
        return jdbcTemplate.update(sql, userId, whiteboardId);
    }

    public List<Integer> getParticipantsByBoard(int boardId) {
        String sql = "SELECT user_id FROM participants WHERE whiteboard_id = ?";
        return jdbcTemplate.queryForList(sql, Integer.class, boardId);
    }
}
