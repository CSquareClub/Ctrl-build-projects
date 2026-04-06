package com.hackinder.Backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.*;

@Service
public class GitHubService {

    @Value("${github.api.token:}")
    private String githubToken;

    private final WebClient webClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public GitHubService() {
        this.webClient = WebClient.builder()
                .baseUrl("https://api.github.com")
                .defaultHeader("Accept", "application/vnd.github.v3+json")
                .build();
    }

    public Map<String, Integer> getTopLanguages(String username) {
        try {
            WebClient.RequestHeadersSpec<?> request = webClient
                    .get()
                    .uri("/users/" + username + "/repos?per_page=30&sort=updated");

            if (githubToken != null && !githubToken.isEmpty()) {
                request = ((WebClient.RequestHeadersUriSpec<?>) webClient
                        .get()
                        .uri("/users/" + username + "/repos?per_page=30&sort=updated"))
                        .header("Authorization", "Bearer " + githubToken);
            }

            String response = request
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            JsonNode repos = objectMapper.readTree(response);
            Map<String, Integer> languageCount = new HashMap<>();

            for (JsonNode repo : repos) {
                JsonNode langNode = repo.get("language");
                if (langNode != null && !langNode.isNull()) {
                    String lang = langNode.asText();
                    languageCount.merge(lang, 1, Integer::sum);
                }
            }

            // Sort and return top 5
            return languageCount.entrySet().stream()
                    .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                    .limit(5)
                    .collect(LinkedHashMap::new,
                            (m, e) -> m.put(e.getKey(), e.getValue()),
                            Map::putAll);

        } catch (Exception e) {
            return new HashMap<>();
        }
    }

    public Map<String, Object> getGitHubProfile(String username) {
        try {
            String response = webClient
                    .get()
                    .uri("/users/" + username)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            JsonNode user = objectMapper.readTree(response);
            Map<String, Object> profile = new HashMap<>();
            profile.put("name", user.path("name").asText(username));
            profile.put("avatar_url", user.path("avatar_url").asText(""));
            profile.put("bio", user.path("bio").asText(""));
            profile.put("public_repos", user.path("public_repos").asInt(0));
            return profile;

        } catch (Exception e) {
            return new HashMap<>();
        }
    }
}