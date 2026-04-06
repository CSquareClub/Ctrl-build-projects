class SkillModel {
  final String skillName;
  final bool isGithubVerified;
  final int proficiency;

  SkillModel({
    required this.skillName,
    required this.isGithubVerified,
    this.proficiency = 0,
  });

  factory SkillModel.fromJson(Map<String, dynamic> json) {
    return SkillModel(
      skillName: json['skillName'] ?? json['skill_name'] ?? '',
      isGithubVerified: json['isGithubVerified'] ?? json['is_github_verified'] ?? false,
      proficiency: json['proficiency'] ?? 0,
    );
  }
}