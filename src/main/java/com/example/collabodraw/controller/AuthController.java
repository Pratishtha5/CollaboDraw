package com.example.collabodraw.controller;

import com.example.collabodraw.exception.UserAlreadyExistsException;
import com.example.collabodraw.model.dto.UserRegistrationDto;
import com.example.collabodraw.service.DatabaseHealthService;
import com.example.collabodraw.service.UserService;
import jakarta.validation.Valid;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

/**
 * Controller for authentication-related endpoints
 */
@Controller
public class AuthController {

    private final UserService userService;
    private final DatabaseHealthService databaseHealthService;

    public AuthController(UserService userService, DatabaseHealthService databaseHealthService) {
        this.userService = userService;
        this.databaseHealthService = databaseHealthService;
    }

    @GetMapping("/auth")
    public String loginPage(@RequestParam(value = "error", required = false) String error, Model model) {
        boolean databaseAvailable = databaseHealthService.refresh();
        model.addAttribute("databaseAvailable", databaseAvailable);
        model.addAttribute("databaseMessage", databaseHealthService.getLastStatusMessage());
        model.addAttribute("databaseReason", databaseHealthService.getLastFailureReason());

        if (!databaseAvailable && error == null) {
            model.addAttribute("error", "Aiven/MySQL is currently unavailable. " + databaseHealthService.getLastFailureReason());
        }

        if (error != null) {
            if ("dbUnavailable".equals(error)) {
                model.addAttribute("error", "Aiven/MySQL is currently unavailable. " + databaseHealthService.getLastFailureReason());
            } else {
                model.addAttribute("error", "Invalid username or password. Please try again.");
            }
        }
        return "auth";
    }

    @PostMapping("/register")
    public String register(@Valid UserRegistrationDto user, Model model) {
        try {
            userService.registerUser(user);
            model.addAttribute("message", "Registration successful! Please log in.");
        } catch (UserAlreadyExistsException e) {
            model.addAttribute("error", e.getMessage());
        } catch (Exception e) {
            model.addAttribute("error", "Registration failed: " + e.getMessage());
        }
        return "auth";
    }
}
