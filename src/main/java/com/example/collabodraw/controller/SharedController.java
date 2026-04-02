package com.example.collabodraw.controller;

import com.example.collabodraw.model.entity.Board;
import com.example.collabodraw.model.entity.BoardInvite;
import com.example.collabodraw.model.entity.BoardMembership;
import com.example.collabodraw.model.entity.User;
import com.example.collabodraw.repository.BoardInviteRepository;
import com.example.collabodraw.repository.BoardMembershipRepository;
import com.example.collabodraw.service.DashboardRealtimeService;
import com.example.collabodraw.service.UserService;
import com.example.collabodraw.repository.ActivityLogRepository;
import com.example.collabodraw.service.WhiteboardService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Controller
public class SharedController {

    private final UserService userService;
    private final WhiteboardService whiteboardService;
    private final BoardMembershipRepository membershipRepository;
    private final ActivityLogRepository activityLogRepository;
    private final BoardInviteRepository boardInviteRepository;
    private final DashboardRealtimeService dashboardRealtimeService;

    public SharedController(UserService userService,
                            WhiteboardService whiteboardService,
                            BoardMembershipRepository membershipRepository,
                            ActivityLogRepository activityLogRepository,
                            BoardInviteRepository boardInviteRepository,
                            DashboardRealtimeService dashboardRealtimeService) {
        this.userService = userService;
        this.whiteboardService = whiteboardService;
        this.membershipRepository = membershipRepository;
        this.activityLogRepository = activityLogRepository;
        this.boardInviteRepository = boardInviteRepository;
        this.dashboardRealtimeService = dashboardRealtimeService;
    }

    @GetMapping("/shared")
    public String shared(Authentication authentication, Model model) {
        User currentUser = null;
        if (authentication != null && authentication.isAuthenticated()) {
            currentUser = userService.findByUsername(authentication.getName());
        }

        if (currentUser != null) {
            model.addAttribute("currentUser", currentUser);
            Map<String, Object> payload = buildSharedPayload(currentUser);
            model.addAttribute("sharedBoards", payload.get("boards"));
            model.addAttribute("sharedStats", payload.get("stats"));
            model.addAttribute("showEmptyState", ((List<?>) payload.get("boards")).isEmpty());
        } else {
            // Not logged in, show public info only
            List<Board> publicBoards = whiteboardService.getPublicWhiteboards();
            model.addAttribute("publicBoards", publicBoards);
            model.addAttribute("sharedBoards", java.util.Collections.emptyList());
            model.addAttribute("showEmptyState", true);
            model.addAttribute("sharedStats", Map.of(
                    "totalSharedBoards", publicBoards != null ? publicBoards.size() : 0,
                    "activeCollaborations", 0,
                    "pendingInvites", 0,
                    "recentActivityTime", "No activity"
            ));
        }

        return "shared";
    }

    @GetMapping("/api/shared/data")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> sharedData(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("success", false, "message", "Unauthorized"));
        }

        User currentUser = userService.findByUsername(authentication.getName());
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("success", false, "message", "User not found"));
        }

        Map<String, Object> payload = buildSharedPayload(currentUser);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.putAll(payload);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/api/shared/invite")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> createInvite(@RequestParam("boardId") Long boardId,
                                                            @RequestParam(value = "username", required = false) String username,
                                                            @RequestParam(value = "email", required = false) String email,
                                                            @RequestParam(value = "role", defaultValue = "viewer") String role,
                                                            Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("success", false, "message", "Unauthorized"));
        }

        User inviter = userService.findByUsername(authentication.getName());
        if (inviter == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("success", false, "message", "Inviter not found"));
        }

        Board board = whiteboardService.getWhiteboardById(boardId);
        if (board == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("success", false, "message", "Board not found"));
        }

        String inviterRole = whiteboardService.getUserRoleInWhiteboard(inviter.getUserId(), boardId);
        boolean canInvite = (board.getOwnerId() != null && board.getOwnerId().equals(inviter.getUserId()))
                || "owner".equalsIgnoreCase(inviterRole)
                || "editor".equalsIgnoreCase(inviterRole);
        if (!canInvite) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("success", false, "message", "No permission to invite"));
        }

        User invitee = null;
        if (email != null && !email.isBlank()) invitee = userService.findByEmail(email.trim());
        if (invitee == null && username != null && !username.isBlank()) invitee = userService.findByUsername(username.trim());
        if (invitee == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Invitee not found"));
        }
        if (invitee.getUserId().equals(inviter.getUserId())) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "You are already on this board"));
        }
        if (membershipRepository.hasAccess(boardId, invitee.getUserId())) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "User already has board access"));
        }
        if (boardInviteRepository.pendingExists(boardId, invitee.getUserId())) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Pending invite already exists"));
        }

        String safeRole = "editor".equalsIgnoreCase(role) ? "editor" : "viewer";
        Long inviteId = boardInviteRepository.create(boardId, inviter.getUserId(), invitee.getUserId(), safeRole);
        if (inviteId == null) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Invite storage unavailable. Apply latest DB schema updates."));
        }
        dashboardRealtimeService.publishUserEvent(invitee.getUserId(), "INVITE_RECEIVED", "You received a board invite");
        return ResponseEntity.ok(Map.of("success", true, "inviteId", inviteId));
    }

    @PostMapping("/api/shared/invites/{inviteId}/accept")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> acceptInvite(@PathVariable("inviteId") Long inviteId,
                                                            Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("success", false, "message", "Unauthorized"));
        }

        User currentUser = userService.findByUsername(authentication.getName());
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("success", false, "message", "User not found"));
        }

        BoardInvite invite = boardInviteRepository.findById(inviteId);
        if (invite == null || !"pending".equalsIgnoreCase(invite.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Invite is not pending"));
        }
        if (!currentUser.getUserId().equals(invite.getInviteeId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("success", false, "message", "Not your invite"));
        }

        whiteboardService.addUserToWhiteboard(invite.getBoardId(), currentUser.getUserId(), invite.getRole());
        boardInviteRepository.updateStatus(inviteId, "accepted");
        dashboardRealtimeService.publishBoardEvent(invite.getBoardId(), "INVITE_ACCEPTED");
        dashboardRealtimeService.publishUserEvent(currentUser.getUserId(), "INVITE_ACCEPTED", "Invite accepted");
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/api/shared/invites/{inviteId}/decline")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> declineInvite(@PathVariable("inviteId") Long inviteId,
                                                             Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("success", false, "message", "Unauthorized"));
        }

        User currentUser = userService.findByUsername(authentication.getName());
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("success", false, "message", "User not found"));
        }

        BoardInvite invite = boardInviteRepository.findById(inviteId);
        if (invite == null || !"pending".equalsIgnoreCase(invite.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Invite is not pending"));
        }
        if (!currentUser.getUserId().equals(invite.getInviteeId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("success", false, "message", "Not your invite"));
        }

        boardInviteRepository.updateStatus(inviteId, "declined");
        dashboardRealtimeService.publishUserEvent(currentUser.getUserId(), "INVITE_DECLINED", "Invite declined");
        return ResponseEntity.ok(Map.of("success", true));
    }

    private Map<String, Object> buildSharedPayload(User currentUser) {
        List<BoardMembership> memberships = membershipRepository.findByUserId(currentUser.getUserId());
        List<BoardMembership> sharedMemberships = memberships.stream()
                .filter(m -> m.getRole() != null && !"owner".equalsIgnoreCase(m.getRole()))
                .toList();

        List<Map<String, Object>> boards = new ArrayList<>();
        List<BoardInvite> pendingInvites = boardInviteRepository.findPendingForUser(currentUser.getUserId());
        List<Map<String, Object>> pendingItems = new ArrayList<>();
        int activeRecently = 0;

        for (BoardMembership membership : sharedMemberships) {
            Board board = whiteboardService.getWhiteboardById(membership.getBoardId());
            if (board == null) continue;

            User owner = userService.findById(board.getOwnerId());
            String ownerName = owner != null ? owner.getUsername() : "Unknown";
            String ownerInitials = ownerName.length() >= 2
                    ? ownerName.substring(0, 2).toUpperCase(Locale.ROOT)
                    : ownerName.toUpperCase(Locale.ROOT);

            int collaborators = membershipRepository.findByBoardId(board.getBoardId()).size();
            int activity24h = activityLogRepository.countRecentActivityForBoard(board.getBoardId(), 24);
            if (activity24h > 0) activeRecently++;

            String permission = mapPermission(membership.getRole());
            String latestActivity = activityLogRepository.latestActivityTextForBoard(board.getBoardId());

            Map<String, Object> item = new HashMap<>();
            item.put("id", board.getBoardId());
            item.put("boardId", board.getBoardId());
            item.put("title", board.getBoardName());
            item.put("userPermission", permission);
            item.put("ownerUsername", ownerName);
            item.put("ownerInitials", ownerInitials);
            item.put("lastActivityAt", board.getLastModified());
            item.put("lastActivity", board.getLastModified() != null ? board.getLastModified().toString() : "No updates yet");
            item.put("hasRecentActivity", activity24h > 0);
            item.put("recentActivityText", latestActivity != null ? latestActivity : "No recent activity");
            item.put("collaboratorCount", collaborators);
            item.put("icon", chooseIcon(board.getBoardName()));
            boards.add(item);
        }

        for (BoardInvite invite : pendingInvites) {
            Board board = whiteboardService.getWhiteboardById(invite.getBoardId());
            User inviter = userService.findById(invite.getInviterId());
            Map<String, Object> pending = new HashMap<>();
            pending.put("inviteId", invite.getInviteId());
            pending.put("boardId", invite.getBoardId());
            pending.put("boardName", board != null ? board.getBoardName() : "Board");
            pending.put("inviter", inviter != null ? inviter.getUsername() : "Unknown");
            pending.put("role", invite.getRole());
            pending.put("createdAt", invite.getCreatedAt());
            pendingItems.add(pending);
        }

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalSharedBoards", boards.size());
        stats.put("activeCollaborations", activeRecently);
        stats.put("pendingInvites", pendingItems.size());
        stats.put("recentActivityTime", activeRecently > 0 ? "Live" : "No activity");

        return Map.of("boards", boards, "stats", stats, "pendingInvites", pendingItems);
    }

    private String mapPermission(String role) {
        if (role == null) return "view";
        return switch (role.toLowerCase(Locale.ROOT)) {
            case "editor" -> "edit";
            case "viewer" -> "view";
            default -> "view";
        };
    }

    private String chooseIcon(String name) {
        String n = name == null ? "" : name.toLowerCase(Locale.ROOT);
        if (n.contains("roadmap")) return "🛣️";
        if (n.contains("design") || n.contains("wire")) return "🎨";
        if (n.contains("idea") || n.contains("brain")) return "💡";
        if (n.contains("kanban") || n.contains("task")) return "📋";
        return "📊";
    }

    // Legacy route support
    @GetMapping("/shared.html")
    public String sharedLegacy() {
        return "redirect:/shared";
    }
}
