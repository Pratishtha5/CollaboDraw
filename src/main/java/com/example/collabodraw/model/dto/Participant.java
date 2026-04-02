package com.example.collabodraw.model.dto;

public class Participant {
    private Long userId;
    private String username;
    private Integer connectionCount;

    public Participant() {}
    public Participant(Long userId, String username) {
        this.userId = userId;
        this.username = username;
        this.connectionCount = 1;
    }
    public Participant(Long userId, String username, Integer connectionCount) {
        this.userId = userId;
        this.username = username;
        this.connectionCount = connectionCount;
    }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public Integer getConnectionCount() { return connectionCount; }
    public void setConnectionCount(Integer connectionCount) { this.connectionCount = connectionCount; }
}