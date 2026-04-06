package com.hackinder.Backend.controller;

import com.hackinder.Backend.service.GitHubService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/github")
@CrossOrigin(origins = "*")
public class GitHubController {

    @Autowired
    private GitHubService gitHubService;

    // GET /api/github/languages/{username}
    @GetMapping("/languages/{username}")
    public ResponseEntity<Map<String, Integer>> getLanguages(@PathVariable String username) {
        Map<String, Integer> languages = gitHubService.getTopLanguages(username);
        if (languages.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(languages);
    }

    // GET /api/github/profile/{username}
    @GetMapping("/profile/{username}")
    public ResponseEntity<Map<String, Object>> getProfile(@PathVariable String username) {
        Map<String, Object> profile = gitHubService.getGitHubProfile(username);
        return ResponseEntity.ok(profile);
    }
}