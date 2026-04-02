package com.example.collabodraw.service;

import com.example.collabodraw.exception.UserAlreadyExistsException;
import com.example.collabodraw.model.dto.UserRegistrationDto;
import com.example.collabodraw.model.entity.User;
import com.example.collabodraw.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.UUID;

/**
 * Service for User-related business logic
 */
@Service
public class UserService {
    
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public User registerUser(UserRegistrationDto registrationDto) {
        // Check if user already exists
        if (userRepository.findByUsername(registrationDto.getUsername()) != null) {
            throw new UserAlreadyExistsException("Username already exists: " + registrationDto.getUsername());
        }
        
        if (userRepository.findByEmail(registrationDto.getEmail()) != null) {
            throw new UserAlreadyExistsException("Email already exists: " + registrationDto.getEmail());
        }

        // Create new user
        User user = new User(
            registrationDto.getUsername(),
            registrationDto.getEmail(),
            passwordEncoder.encode(registrationDto.getPassword())
        );

        int result = userRepository.save(user);
        if (result <= 0) {
            throw new RuntimeException("Failed to save user");
        }
        return user;
    }

    public User findByUsername(String username) {
        if (username == null || username.isBlank()) {
            return null;
        }

        User byUsername = userRepository.findByUsername(username);
        if (byUsername != null) {
            return byUsername;
        }

        // For OAuth logins, Spring principal name can be the email address.
        if (username.contains("@")) {
            User byEmail = userRepository.findByEmail(username);
            if (byEmail != null) {
                return byEmail;
            }
            return createOAuthUserFromEmail(username);
        }

        return null;
    }

    public User findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    private User createOAuthUserFromEmail(String email) {
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        if (normalizedEmail.isBlank()) {
            return null;
        }

        User existing = userRepository.findByEmail(normalizedEmail);
        if (existing != null) {
            return existing;
        }

        String base = normalizedEmail.substring(0, normalizedEmail.indexOf('@'))
                .replaceAll("[^A-Za-z0-9_-]", "_");
        if (base.isBlank()) {
            base = "oauth_user";
        }

        String candidate = base;
        int suffix = 1;
        while (userRepository.existsByUsername(candidate)) {
            candidate = base + "_" + suffix;
            suffix++;
        }

        // Store a random hash to satisfy schema requirements; OAuth users do not use this password.
        User oauthUser = new User(candidate, normalizedEmail, passwordEncoder.encode(UUID.randomUUID().toString()));
        int result = userRepository.save(oauthUser);
        if (result <= 0) {
            throw new RuntimeException("Failed to create OAuth user profile");
        }
        return userRepository.findByEmail(normalizedEmail);
    }

    public User findById(Long id) {
        return userRepository.findById(id);
    }
    
    public User updateUser(User user) {
        int result = userRepository.update(user);
        if (result <= 0) {
            throw new RuntimeException("Failed to update user");
        }
        return user;
    }
}
