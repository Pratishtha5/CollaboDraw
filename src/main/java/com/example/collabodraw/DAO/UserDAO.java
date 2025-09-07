package com.example.collabodraw.DAO;

import com.example.collabodraw.whiteboard.UserRegistrationDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class UserDAO {

    private final JdbcTemplate jdbcTemplate;

    public UserDAO(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public int saveUser(UserRegistrationDto user) {
        String sql = "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)";
        return jdbcTemplate.update(sql, user.getUsername(), user.getEmail(), user.getPasswordHash());
    }

    public UserRegistrationDto findByUsername(String username) {
        String sql = "SELECT * FROM users WHERE username = ?";
        try {
            return jdbcTemplate.queryForObject(sql, (rs, rowNum) -> {
                UserRegistrationDto user = new UserRegistrationDto();
                user.setUsername(rs.getString("username"));
                user.setEmail(rs.getString("email"));
                user.setPasswordHash(rs.getString("password_hash"));
                return user;
            }, username);
        } catch (Exception e) {
            return null;
        }
    }
}
