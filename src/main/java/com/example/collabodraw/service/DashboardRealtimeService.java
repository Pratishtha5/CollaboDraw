package com.example.collabodraw.service;

import com.example.collabodraw.repository.BoardMembershipRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class DashboardRealtimeService {
    private final SimpMessagingTemplate messagingTemplate;
    private final BoardMembershipRepository membershipRepository;

    public DashboardRealtimeService(SimpMessagingTemplate messagingTemplate,
                                    BoardMembershipRepository membershipRepository) {
        this.messagingTemplate = messagingTemplate;
        this.membershipRepository = membershipRepository;
    }

    public void publishBoardEvent(Long boardId, String eventType) {
        if (boardId == null) return;
        List<Long> memberIds = membershipRepository.findUserIdsByBoardId(boardId);
        Set<Long> unique = new HashSet<>(memberIds);
        for (Long userId : unique) {
            if (userId == null) continue;
            messagingTemplate.convertAndSend("/topic/dashboard." + userId + ".updates",
                    Map.of("type", eventType, "boardId", boardId, "at", java.time.Instant.now().toString()));
        }
    }

    public void publishUserEvent(Long userId, String eventType, String message) {
        if (userId == null) return;
        messagingTemplate.convertAndSend("/topic/dashboard." + userId + ".updates",
                Map.of("type", eventType, "message", message, "at", java.time.Instant.now().toString()));
    }
}
