package com.hackinder.Backend.service;

import com.hackinder.Backend.model.Profile;
import com.hackinder.Backend.model.Skill;
import com.hackinder.Backend.repository.ProfileRepository;
import com.hackinder.Backend.repository.SkillRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class SynergyService {

    @Autowired
    private ProfileRepository profileRepository;

    @Autowired
    private SkillRepository skillRepository;

    public int calculateSynergyScore(UUID currentUserId, UUID targetUserId) {
        List<Skill> mySkills = skillRepository.findByUserId(currentUserId);
        List<Skill> theirSkills = skillRepository.findByUserId(targetUserId);

        Set<String> mySkillNames = mySkills.stream()
                .map(s -> s.getSkillName().toLowerCase())
                .collect(Collectors.toSet());

        Set<String> theirSkillNames = theirSkills.stream()
                .map(s -> s.getSkillName().toLowerCase())
                .collect(Collectors.toSet());

        // Complementary skills — they have what I don't
        long complementary = theirSkillNames.stream()
                .filter(s -> !mySkillNames.contains(s))
                .count();

        // GitHub verified bonus
        long verifiedCount = theirSkills.stream()
                .filter(Skill::getIsGithubVerified)
                .count();

        // Base score from complementary skills
        int base = (int) Math.min(complementary * 20, 60);

        // Verified bonus (up to 30 points)
        int verifiedBonus = (int) Math.min(verifiedCount * 10, 30);

        // Role diversity bonus (10 points)
        Profile me = profileRepository.findById(currentUserId).orElse(null);
        Profile them = profileRepository.findById(targetUserId).orElse(null);
        int roleBonus = 0;
        if (me != null && them != null &&
                !me.getPrimaryRole().equals(them.getPrimaryRole())) {
            roleBonus = 10;
        }

        return Math.min(base + verifiedBonus + roleBonus, 100);
    }

    public List<Map<String, Object>> getRankedMatches(
            UUID currentUserId, boolean onlineMode) {

        List<Profile> allProfiles = profileRepository.findAll();
        Profile currentUser = profileRepository.findById(currentUserId)
                .orElse(null);

        if (currentUser == null) return new ArrayList<>();

        List<Map<String, Object>> results = new ArrayList<>();

        for (Profile p : allProfiles) {
            if (p.getId().equals(currentUserId)) continue;

            int synergy = calculateSynergyScore(currentUserId, p.getId());
            List<Skill> skills = skillRepository.findByUserId(p.getId());

            Map<String, Object> match = new HashMap<>();
            match.put("profile", p);
            match.put("synergyScore", synergy);
            match.put("skills", skills);

            if (!onlineMode) {
                // Offline: penalize if different city
                boolean sameCity = currentUser.getLocation() != null &&
                        p.getLocation() != null &&
                        currentUser.getLocation().equalsIgnoreCase(p.getLocation());
                int feasibility = sameCity ? synergy : (int)(synergy * 0.7);
                match.put("synergyScore", feasibility);
            }

            results.add(match);
        }

        results.sort((a, b) ->
                (int) b.get("synergyScore") - (int) a.get("synergyScore"));

        return results;
    }
}