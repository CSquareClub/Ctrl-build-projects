package com.hackinder.Backend.repository;

import com.hackinder.Backend.model.Skill;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface SkillRepository extends JpaRepository<Skill, UUID> {
    List<Skill> findByUserId(UUID userId);
    void deleteByUserId(UUID userId);
}