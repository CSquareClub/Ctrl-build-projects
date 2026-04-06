import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/constants.dart';
import '../models/match_model.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  final String _base = AppConstants.baseUrl;

  // Fetch GitHub languages for a username
  Future<Map<String, int>> getGithubLanguages(String username) async {
    try {
      final response = await http.get(
        Uri.parse('$_base/github/languages/$username'),
      );
      if (response.statusCode == 200) {
        final Map<String, dynamic> data = jsonDecode(response.body);
        return data.map((k, v) => MapEntry(k, v as int));
      }
    } catch (e) {
      print('GitHub API error: $e');
    }
    return {};
  }

  // Fetch GitHub profile info
  Future<Map<String, dynamic>> getGithubProfile(String username) async {
    try {
      final response = await http.get(
        Uri.parse('$_base/github/profile/$username'),
      );
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
    } catch (e) {
      print('GitHub profile error: $e');
    }
    return {};
  }

  // Fetch match feed
  Future<List<MatchModel>> getFeed(String userId, {bool onlineMode = true}) async {
    try {
      final response = await http.get(
        Uri.parse('$_base/match/feed/$userId?mode=${onlineMode ? 'online' : 'offline'}'),
      );
      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        return data.map((m) => MatchModel.fromJson(m)).toList();
      }
    } catch (e) {
      print('Feed error: $e');
    }
    return [];
  }

  // Send connection request
  Future<bool> sendConnection(String senderId, String receiverId, String message) async {
    try {
      final response = await http.post(
        Uri.parse('$_base/connections/send'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'senderId': senderId,
          'receiverId': receiverId,
          'message': message,
        }),
      );
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (e) {
      print('Connection error: $e');
      return false;
    }
  }
}