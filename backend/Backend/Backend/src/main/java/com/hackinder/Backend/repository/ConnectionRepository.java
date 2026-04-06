package com.hackinder.Backend.repository;

import com.hackinder.Backend.model.Connection;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ConnectionRepository extends JpaRepository<Connection, UUID> {
    List<Connection> findBySenderIdOrReceiverId(UUID senderId, UUID receiverId);
}