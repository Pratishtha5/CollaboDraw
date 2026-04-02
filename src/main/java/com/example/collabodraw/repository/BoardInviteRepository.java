package com.example.collabodraw.repository;

import com.example.collabodraw.model.entity.BoardInvite;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.List;

@Repository
public class BoardInviteRepository {
    private static final Logger log = LoggerFactory.getLogger(BoardInviteRepository.class);
    private final JdbcTemplate jdbcTemplate;

    public BoardInviteRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Long create(Long boardId, Long inviterId, Long inviteeId, String role) {
        try {
            String sql = "INSERT INTO board_invites (board_id, inviter_id, invitee_id, role, status) VALUES (?,?,?,?, 'pending')";
            KeyHolder keyHolder = new GeneratedKeyHolder();
            jdbcTemplate.update(conn -> {
                PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
                ps.setLong(1, boardId);
                ps.setLong(2, inviterId);
                ps.setLong(3, inviteeId);
                ps.setString(4, role);
                return ps;
            }, keyHolder);
            Number k = keyHolder.getKey();
            return k != null ? k.longValue() : null;
        } catch (DataAccessException ex) {
            log.warn("Board invite create failed: {}", ex.getMessage());
            return null;
        }
    }

    public boolean pendingExists(Long boardId, Long inviteeId) {
        try {
            String sql = "SELECT COUNT(*) FROM board_invites WHERE board_id=? AND invitee_id=? AND status='pending'";
            Integer count = jdbcTemplate.queryForObject(sql, Integer.class, boardId, inviteeId);
            return count != null && count > 0;
        } catch (DataAccessException ex) {
            return false;
        }
    }

    public int countPendingForUser(Long inviteeId) {
        try {
            String sql = "SELECT COUNT(*) FROM board_invites WHERE invitee_id=? AND status='pending'";
            Integer count = jdbcTemplate.queryForObject(sql, Integer.class, inviteeId);
            return count != null ? count : 0;
        } catch (DataAccessException ex) {
            return 0;
        }
    }

    public List<BoardInvite> findPendingForUser(Long inviteeId) {
        try {
            String sql = "SELECT * FROM board_invites WHERE invitee_id=? AND status='pending' ORDER BY created_at DESC";
            return jdbcTemplate.query(sql, mapper(), inviteeId);
        } catch (DataAccessException ex) {
            return java.util.Collections.emptyList();
        }
    }

    public BoardInvite findById(Long inviteId) {
        String sql = "SELECT * FROM board_invites WHERE invite_id=?";
        try {
            return jdbcTemplate.queryForObject(sql, mapper(), inviteId);
        } catch (EmptyResultDataAccessException ex) {
            return null;
        }
    }

    public int updateStatus(Long inviteId, String status) {
        try {
            String sql = "UPDATE board_invites SET status=?, responded_at=NOW() WHERE invite_id=?";
            return jdbcTemplate.update(sql, status, inviteId);
        } catch (DataAccessException ex) {
            return 0;
        }
    }

    private RowMapper<BoardInvite> mapper() {
        return new RowMapper<BoardInvite>() {
            @Override
            public BoardInvite mapRow(@NonNull ResultSet rs, int rowNum) throws SQLException {
                BoardInvite i = new BoardInvite();
                i.setInviteId(rs.getLong("invite_id"));
                i.setBoardId(rs.getLong("board_id"));
                i.setInviterId(rs.getLong("inviter_id"));
                i.setInviteeId(rs.getLong("invitee_id"));
                i.setRole(rs.getString("role"));
                i.setStatus(rs.getString("status"));
                java.sql.Timestamp created = rs.getTimestamp("created_at");
                if (created != null) i.setCreatedAt(created.toLocalDateTime());
                java.sql.Timestamp responded = rs.getTimestamp("responded_at");
                if (responded != null) i.setRespondedAt(responded.toLocalDateTime());
                return i;
            }
        };
    }
}
