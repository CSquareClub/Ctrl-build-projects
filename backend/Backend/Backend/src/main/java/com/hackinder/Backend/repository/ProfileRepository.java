package com.hackinder.Backend.repository;

import com.hackinder.Backend.model.Profile;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface ProfileRepository extends JpaRepository<Profile, UUID> {
    Optional<Profile> findByGithubUsername(String githubUsername);
}