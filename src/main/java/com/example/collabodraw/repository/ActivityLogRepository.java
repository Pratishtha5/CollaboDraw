package com.example.collabodraw.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ActivityLogRepository {
    private final JdbcTemplate jdbcTemplate;

    public ActivityLogRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public int countRecentActivityForUserBoards(Long userId, int hours) {
        String sql = "SELECT COUNT(*) FROM activity_log WHERE board_id IN ("
                + "SELECT board_id FROM board_membership WHERE user_id = ?) "
                + "AND at_time >= NOW() - INTERVAL ? HOUR";
        Integer c = jdbcTemplate.queryForObject(sql, Integer.class, userId, hours);
        return c != null ? c : 0;
    }

    public int countRecentActivityByUser(Long userId, int hours) {
        String sql = "SELECT COUNT(*) FROM activity_log WHERE actor_id = ? "
                + "AND at_time >= NOW() - INTERVAL ? HOUR";
        Integer c = jdbcTemplate.queryForObject(sql, Integer.class, userId, hours);
        return c != null ? c : 0;
    }

    public int countRecentActivityForBoard(Long boardId, int hours) {
        String sql = "SELECT COUNT(*) FROM activity_log WHERE board_id = ? "
                + "AND at_time >= NOW() - INTERVAL ? HOUR";
        Integer c = jdbcTemplate.queryForObject(sql, Integer.class, boardId, hours);
        return c != null ? c : 0;
    }

    public String latestActivityTextForBoard(Long boardId) {
        String sql = "SELECT CONCAT(u.username, ' ', al.action) "
                + "FROM activity_log al JOIN users u ON al.actor_id = u.user_id "
                + "WHERE al.board_id = ? ORDER BY al.at_time DESC LIMIT 1";
        try {
            return jdbcTemplate.queryForObject(sql, String.class, boardId);
        } catch (org.springframework.dao.EmptyResultDataAccessException ex) {
            return null;
        }
    }
}
