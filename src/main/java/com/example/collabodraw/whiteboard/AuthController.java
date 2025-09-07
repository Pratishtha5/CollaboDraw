package com.example.collabodraw.whiteboard;

import com.example.collabodraw.DAO.UserDAO;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

@Controller
public class AuthController {

    private final UserDAO userDAO;
    private final PasswordEncoder passwordEncoder;

    public AuthController(UserDAO userDAO, PasswordEncoder passwordEncoder) {
        this.userDAO = userDAO;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping("/auth")
    public String loginPage() {
        return "auth";  // Thymeleaf login page template
    }

    @PostMapping("/register")
    public String register(@ModelAttribute UserRegistrationDto user, Model model) {
        // Hash password before saving
        user.setPasswordHash(passwordEncoder.encode(user.getPassword()));
        userDAO.saveUser(user);
        model.addAttribute("message", "Registration successful! Please log in.");
        return "auth"; // Show login page after registration
    }

    // Remove manual /login POST method entirely
}
