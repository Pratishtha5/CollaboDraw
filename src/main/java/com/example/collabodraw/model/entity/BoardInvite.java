package com.example.collabodraw.model.entity;

import java.time.LocalDateTime;

public class BoardInvite {
    private Long inviteId;
    private Long boardId;
    private Long inviterId;
    private Long inviteeId;
    private String role;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime respondedAt;

    public Long getInviteId() { return inviteId; }
    public void setInviteId(Long inviteId) { this.inviteId = inviteId; }

    public Long getBoardId() { return boardId; }
    public void setBoardId(Long boardId) { this.boardId = boardId; }

    public Long getInviterId() { return inviterId; }
    public void setInviterId(Long inviterId) { this.inviterId = inviterId; }

    public Long getInviteeId() { return inviteeId; }
    public void setInviteeId(Long inviteeId) { this.inviteeId = inviteeId; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getRespondedAt() { return respondedAt; }
    public void setRespondedAt(LocalDateTime respondedAt) { this.respondedAt = respondedAt; }
}
