package com.hackinder.Backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.util.UUID;

@Entity
@Table(name = "skills")
@Data
public class Skill {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "skill_name")
    private String skillName;

    @Column(name = "is_github_verified")
    private Boolean isGithubVerified = false;

    private Integer proficiency = 0;
}