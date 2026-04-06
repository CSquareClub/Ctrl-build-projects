import 'profile_model.dart';

class MatchModel {
  final ProfileModel profile;
  final int synergyScore;
  final List<String> matchingSkills;
  final List<String> complementarySkills;

  MatchModel({
    required this.profile,
    required this.synergyScore,
    this.matchingSkills = const [],
    this.complementarySkills = const [],
  });

  factory MatchModel.fromJson(Map<String, dynamic> json) {
    return MatchModel(
      profile: ProfileModel.fromJson(json['profile'] ?? json),
      synergyScore: json['synergyScore'] ?? json['synergy_score'] ?? 0,
      matchingSkills: List<String>.from(json['matchingSkills'] ?? []),
      complementarySkills: List<String>.from(json['complementarySkills'] ?? []),
    );
  }
}