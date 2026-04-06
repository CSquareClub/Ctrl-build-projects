import 'package:flutter/material.dart';
import '../models/match_model.dart';
import '../theme/app_theme.dart';
import 'skill_badge.dart';
import 'synergy_meter.dart';

class MatchCard extends StatelessWidget {
  final MatchModel match;

  const MatchCard({super.key, required this.match});

  @override
  Widget build(BuildContext context) {
    final p = match.profile;
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppTheme.primary.withOpacity(0.1),
              borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(24)),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 32,
                  backgroundColor: AppTheme.primary,
                  backgroundImage: p.avatarUrl.isNotEmpty
                      ? NetworkImage(p.avatarUrl) : null,
                  child: p.avatarUrl.isEmpty
                      ? Text(
                    p.fullName.isNotEmpty
                        ? p.fullName[0].toUpperCase() : '?',
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 24,
                        fontWeight: FontWeight.bold),
                  )
                      : null,
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            p.fullName,
                            style: const TextStyle(
                                color: AppTheme.textPrimary,
                                fontSize: 18,
                                fontWeight: FontWeight.bold),
                          ),
                          if (p.isVerified) ...[
                            const SizedBox(width: 6),
                            const Icon(Icons.verified,
                                color: AppTheme.verified, size: 16),
                          ],
                        ],
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: AppTheme.primary.withOpacity(0.2),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              p.primaryRole,
                              style: const TextStyle(
                                  color: AppTheme.primary,
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600),
                            ),
                          ),
                          if (p.location.isNotEmpty) ...[
                            const SizedBox(width: 8),
                            const Icon(Icons.location_on,
                                color: AppTheme.textSecondary, size: 12),
                            Text(p.location,
                                style: const TextStyle(
                                    color: AppTheme.textSecondary,
                                    fontSize: 12)),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),
                SynergyMeter(score: match.synergyScore),
              ],
            ),
          ),

          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (p.bio.isNotEmpty) ...[
                  Text(p.bio,
                      style: const TextStyle(
                          color: AppTheme.textSecondary, fontSize: 13,
                          height: 1.5),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 16),
                ],

                // Skills
                if (p.skills.isNotEmpty) ...[
                  const Text('Skills',
                      style: TextStyle(
                          color: AppTheme.textSecondary,
                          fontSize: 12,
                          fontWeight: FontWeight.w500)),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 6, runSpacing: 6,
                    children: p.skills.take(6).map((s) =>
                        SkillBadge(
                          skill: s.skillName,
                          isVerified: s.isGithubVerified,
                        )
                    ).toList(),
                  ),
                ],

                const SizedBox(height: 16),
                Row(
                  children: [
                    const Icon(Icons.code,
                        color: AppTheme.textSecondary, size: 14),
                    const SizedBox(width: 4),
                    Text(
                      '@${p.githubUsername}',
                      style: const TextStyle(
                          color: AppTheme.textSecondary, fontSize: 13),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}