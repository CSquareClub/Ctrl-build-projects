package com.hackinder.Backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "profiles")
@Data
public class Profile {

    @Id
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "full_name")
    private String fullName;

    @Column(name = "github_username", unique = true)
    private String githubUsername;

    private String bio;
    private String location;

    @Column(name = "primary_role")
    private String primaryRole;

    @Column(name = "is_verified")
    private Boolean isVerified = false;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @OneToMany(mappedBy = "userId", fetch = FetchType.EAGER)
    private List<Skill> skills;
}