package com.hackinder.Backend.controller;

import com.hackinder.Backend.service.SynergyService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/match")
@CrossOrigin(origins = "*")
public class MatchController {

    @Autowired
    private SynergyService synergyService;

    @GetMapping("/feed/{userId}")
    public ResponseEntity<List<Map<String, Object>>> getFeed(
            @PathVariable String userId,
            @RequestParam(defaultValue = "online") String mode) {
        List<Map<String, Object>> matches = synergyService
                .getRankedMatches(UUID.fromString(userId),
                        mode.equals("online"));
        return ResponseEntity.ok(matches);
    }
}