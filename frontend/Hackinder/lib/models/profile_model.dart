import 'skill_model.dart';

class ProfileModel {
  final String id;
  final String fullName;
  final String githubUsername;
  final String bio;
  final String location;
  final String primaryRole;
  final bool isVerified;
  final String avatarUrl;
  final List<SkillModel> skills;
  final int synergyScore;

  ProfileModel({
    required this.id,
    required this.fullName,
    required this.githubUsername,
    this.bio = '',
    this.location = '',
    required this.primaryRole,
    this.isVerified = false,
    this.avatarUrl = '',
    this.skills = const [],
    this.synergyScore = 0,
  });

  factory ProfileModel.fromJson(Map<String, dynamic> json) {
    return ProfileModel(
      id: json['id'] ?? '',
      fullName: json['fullName'] ?? json['full_name'] ?? 'Unknown',
      githubUsername: json['githubUsername'] ?? json['github_username'] ?? '',
      bio: json['bio'] ?? '',
      location: json['location'] ?? '',
      primaryRole: json['primaryRole'] ?? json['primary_role'] ?? 'Hacker',
      isVerified: json['isVerified'] ?? json['is_verified'] ?? false,
      avatarUrl: json['avatarUrl'] ?? json['avatar_url'] ?? '',
      skills: (json['skills'] as List<dynamic>?)
          ?.map((s) => SkillModel.fromJson(s))
          .toList() ?? [],
      synergyScore: json['synergyScore'] ?? 0,
    );
  }
}