package com.hackinder.Backend.controller;

import com.hackinder.Backend.model.Connection;
import com.hackinder.Backend.repository.ConnectionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/connections")
@CrossOrigin(origins = "*")
public class ConnectionController {

    @Autowired
    private ConnectionRepository connectionRepository;

    @PostMapping("/send")
    public ResponseEntity<Connection> sendConnection(
            @RequestBody Map<String, String> body) {
        Connection c = new Connection();
        c.setSenderId(UUID.fromString(body.get("senderId")));
        c.setReceiverId(UUID.fromString(body.get("receiverId")));
        c.setMessage(body.get("message"));
        c.setStatus("pending");
        return ResponseEntity.ok(connectionRepository.save(c));
    }

    @GetMapping("/{userId}")
    public ResponseEntity<List<Connection>> getConnections(
            @PathVariable String userId) {
        UUID id = UUID.fromString(userId);
        return ResponseEntity.ok(
                connectionRepository.findBySenderIdOrReceiverId(id, id));
    }
}