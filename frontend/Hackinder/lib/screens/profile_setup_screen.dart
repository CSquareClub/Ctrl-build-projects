import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../theme/app_theme.dart';
import '../config/constants.dart';
import '../services/api_service.dart';
import 'feed_screen.dart';

class ProfileSetupScreen extends StatefulWidget {
  const ProfileSetupScreen({super.key});

  @override
  State<ProfileSetupScreen> createState() => _ProfileSetupScreenState();
}

class _ProfileSetupScreenState extends State<ProfileSetupScreen> {
  final _nameController = TextEditingController();
  final _githubController = TextEditingController();
  final _bioController = TextEditingController();

  // NEW: Dropdown state and city list
  String _selectedCity = '';
  static const List<String> _indianCities = [
    'Ahmedabad','Bengaluru','Bhopal','Bhubaneswar','Chandigarh','Kharar',
    'Chennai','Coimbatore','Dehradun','Delhi','Faridabad',
    'Ghaziabad','Gurugram','Guwahati','Hyderabad','Indore',
    'Jaipur','Jodhpur','Kanpur','Kochi','Kolkata',
    'Kozhikode','Lucknow','Ludhiana','Madurai','Mangaluru',
    'Mumbai','Mysuru','Nagpur','Nashik','Navi Mumbai',
    'Noida','Patna','Pune','Raipur','Rajkot',
    'Ranchi','Surat','Thiruvananthapuram','Thane','Udaipur',
    'Vadodara','Varanasi','Vijayawada','Visakhapatnam','Agra',
    'Amritsar','Aurangabad','Jabalpur','Jamshedpur','Meerut',
  ];

  String _selectedRole = 'Hacker';
  bool _isLoading = false;
  bool _verifyingGithub = false;
  Map<String, int> _detectedLanguages = {};
  String _error = '';

  Future<void> _verifyGithub() async {
    final username = _githubController.text.trim();
    if (username.isEmpty) return;
    setState(() { _verifyingGithub = true; _detectedLanguages = {}; });
    final langs = await ApiService().getGithubLanguages(username);
    final profile = await ApiService().getGithubProfile(username);
    setState(() {
      _verifyingGithub = false;
      _detectedLanguages = langs;
      if (profile['name'] != null && _nameController.text.isEmpty) {
        _nameController.text = profile['name'];
      }
    });
  }

  Future<void> _saveProfile() async {
    // UPDATED: Validation for _selectedCity
    if (_nameController.text.isEmpty || _githubController.text.isEmpty || _selectedCity.isEmpty) {
      setState(() { _error = 'Name, GitHub username, and city are required'; });
      return;
    }
    setState(() { _isLoading = true; _error = ''; });
    try {
      final user = Supabase.instance.client.auth.currentUser!;
      await Supabase.instance.client.from('profiles').upsert({
        'id': user.id,
        'full_name': _nameController.text.trim(),
        'github_username': _githubController.text.trim(),
        'bio': _bioController.text.trim(),
        'location': _selectedCity, // UPDATED: Using dropdown value
        'primary_role': _selectedRole,
        'is_verified': _detectedLanguages.isNotEmpty,
      });

      if (_detectedLanguages.isNotEmpty) {
        final skills = _detectedLanguages.entries.map((e) => {
          'user_id': user.id,
          'skill_name': e.key,
          'is_github_verified': true,
          'proficiency': e.value,
        }).toList();
        await Supabase.instance.client.from('skills').upsert(skills);
      }

      if (mounted) {
        Navigator.pushReplacement(context,
            MaterialPageRoute(builder: (_) => const FeedScreen()));
      }
    } catch (e) {
      setState(() { _error = e.toString(); });
    } finally {
      if (mounted) setState(() { _isLoading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('Setup Profile'),
        backgroundColor: AppTheme.background,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 560),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('Tell us about yourself',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold,
                      color: AppTheme.textPrimary)),
              const SizedBox(height: 24),
              _buildField(_nameController, 'Full Name', Icons.person_outline),
              const SizedBox(height: 16),

              // NEW: Dropdown for City Selection
              DropdownButtonFormField<String>(
                value: _selectedCity.isEmpty ? null : _selectedCity,
                decoration: InputDecoration(
                  labelText: 'City',
                  labelStyle: const TextStyle(color: AppTheme.textSecondary),
                  prefixIcon: const Icon(Icons.location_on_outlined,
                      color: AppTheme.textSecondary, size: 20),
                  filled: true,
                  fillColor: AppTheme.card,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide.none,
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: AppTheme.primary, width: 1.5),
                  ),
                ),
                dropdownColor: AppTheme.card,
                style: const TextStyle(color: AppTheme.textPrimary),
                hint: const Text('Select your city',
                    style: TextStyle(color: AppTheme.textSecondary)),
                items: _indianCities.map((city) => DropdownMenuItem(
                  value: city,
                  child: Text(city),
                )).toList(),
                onChanged: (val) => setState(() => _selectedCity = val ?? ''),
              ),

              const SizedBox(height: 16),
              _buildField(_bioController, 'Short Bio', Icons.info_outline,
                  maxLines: 2),
              const SizedBox(height: 24),

              // ... [Rest of your UI remains the same]
              const Text('I am a...',
                  style: TextStyle(color: AppTheme.textSecondary, fontSize: 14)),
              const SizedBox(height: 12),
              Row(
                children: AppConstants.roles.map((role) {
                  final selected = _selectedRole == role;
                  return Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _selectedRole = role),
                      child: Container(
                        margin: const EdgeInsets.only(right: 8),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        decoration: BoxDecoration(
                          color: selected ? AppTheme.primary : AppTheme.card,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                              color: selected ? AppTheme.primary : Colors.transparent),
                        ),
                        child: Column(
                          children: [
                            Text(role,
                              style: TextStyle(
                                  color: selected ? Colors.white : AppTheme.textSecondary,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 13),
                              textAlign: TextAlign.center,
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 24),
              const Text('GitHub Username',
                  style: TextStyle(color: AppTheme.textSecondary, fontSize: 14)),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: _buildField(_githubController, 'e.g. torvalds',
                        Icons.code),
                  ),
                  const SizedBox(width: 12),
                  ElevatedButton(
                    onPressed: _verifyingGithub ? null : _verifyGithub,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.accent,
                      padding: const EdgeInsets.symmetric(
                          horizontal: 20, vertical: 16),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14)),
                    ),
                    child: _verifyingGithub
                        ? const SizedBox(width: 20, height: 20,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white))
                        : const Text('Verify',
                        style: TextStyle(color: Colors.white,
                            fontWeight: FontWeight.w600)),
                  ),
                ],
              ),
              if (_detectedLanguages.isNotEmpty) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppTheme.card,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppTheme.accent.withOpacity(0.3)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: const [
                          Icon(Icons.verified, color: AppTheme.accent, size: 16),
                          SizedBox(width: 6),
                          Text('Code DNA Detected!',
                              style: TextStyle(color: AppTheme.accent,
                                  fontWeight: FontWeight.w600, fontSize: 13)),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 8, runSpacing: 8,
                        children: _detectedLanguages.entries.map((e) =>
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 6),
                              decoration: BoxDecoration(
                                color: AppTheme.primary.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                    color: AppTheme.primary.withOpacity(0.5)),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.check_circle,
                                      color: AppTheme.verified, size: 12),
                                  const SizedBox(width: 4),
                                  Text(e.key,
                                      style: const TextStyle(
                                          color: AppTheme.textPrimary,
                                          fontSize: 12,
                                          fontWeight: FontWeight.w500)),
                                  const SizedBox(width: 4),
                                  Text('×${e.value}',
                                      style: const TextStyle(
                                          color: AppTheme.textSecondary,
                                          fontSize: 11)),
                                ],
                              ),
                            ),
                        ).toList(),
                      ),
                    ],
                  ),
                ),
              ],
              if (_error.isNotEmpty) ...[
                const SizedBox(height: 12),
                Text(_error,
                    style: const TextStyle(color: AppTheme.danger, fontSize: 13)),
              ],
              const SizedBox(height: 32),
              SizedBox(
                height: 52,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _saveProfile,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primary,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14)),
                  ),
                  child: _isLoading
                      ? const CircularProgressIndicator(
                      color: Colors.white, strokeWidth: 2)
                      : const Text('Start Matching!',
                      style: TextStyle(fontSize: 16,
                          fontWeight: FontWeight.w600, color: Colors.white)),
                ),
              ),
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildField(TextEditingController c, String label,
      IconData icon, {int maxLines = 1}) {
    return TextField(
      controller: c,
      maxLines: maxLines,
      style: const TextStyle(color: AppTheme.textPrimary),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: AppTheme.textSecondary),
        prefixIcon: Icon(icon, color: AppTheme.textSecondary, size: 20),
        filled: true,
        fillColor: AppTheme.card,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: AppTheme.primary, width: 1.5),
        ),
      ),
    );
  }
}