import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../theme/app_theme.dart';
import '../models/match_model.dart';
import '../models/profile_model.dart';
import '../models/skill_model.dart';
import '../widgets/match_card.dart';
import '../services/api_service.dart';
import 'auth_screen.dart';

class FeedScreen extends StatefulWidget {
  const FeedScreen({super.key});

  @override
  State<FeedScreen> createState() => _FeedScreenState();
}

class _FeedScreenState extends State<FeedScreen> {
  bool _onlineMode = true;
  bool _isLoading = false;
  List<MatchModel> _matches = [];
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    _loadFeed();
  }

  // UPDATED: Now fetches only live data from Spring Boot
  Future<void> _loadFeed() async {
    setState(() => _isLoading = true);
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) {
      setState(() => _isLoading = false);
      return;
    }

    final matches = await ApiService().getFeed(user.id,
        onlineMode: _onlineMode);

    setState(() {
      _matches = matches;
      _isLoading = false;
      _currentIndex = 0;
    });
  }

  // REMOVED: _getDemoMatches() is gone. We only use live API data now.

  void _onSwipeLeft() {
    if (_currentIndex < _matches.length - 1) {
      setState(() => _currentIndex++);
    } else {
      setState(() => _currentIndex++); // Will trigger _buildAllSwiped()
    }
  }

  // ... [Rest of your swipe and connect logic remains the same]
  void _onSwipeRight() {
    if (_currentIndex < _matches.length) {
      _showConnectModal(_matches[_currentIndex]);
    }
  }

  void _showConnectModal(MatchModel match) {
    final msgController = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppTheme.surface,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom,
            left: 24, right: 24, top: 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 24,
                  backgroundColor: AppTheme.primary,
                  child: Text(
                      match.profile.fullName[0].toUpperCase(),
                      style: const TextStyle(color: Colors.white,
                          fontWeight: FontWeight.bold)),
                ),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Connect with ${match.profile.fullName}',
                        style: const TextStyle(
                            color: AppTheme.textPrimary,
                            fontWeight: FontWeight.bold,
                            fontSize: 16)),
                    Text('${match.synergyScore}% synergy match',
                        style: const TextStyle(
                            color: AppTheme.accent, fontSize: 13)),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 20),
            TextField(
              controller: msgController,
              maxLines: 4,
              maxLength: 200,
              style: const TextStyle(color: AppTheme.textPrimary),
              decoration: InputDecoration(
                hintText: 'Write your pitch... why should they team up with you?',
                hintStyle: const TextStyle(color: AppTheme.textSecondary),
                filled: true,
                fillColor: AppTheme.card,
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: BorderSide.none),
                focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(
                        color: AppTheme.primary, width: 1.5)),
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () async {
                final user = Supabase.instance.client.auth.currentUser;
                if (user == null) return;
                await ApiService().sendConnection(
                    user.id, match.profile.id, msgController.text);
                if (ctx.mounted) Navigator.pop(ctx);
                if (mounted) _onSwipeLeft();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
              ),
              child: const Text('Send Pitch',
                  style: TextStyle(color: Colors.white,
                      fontWeight: FontWeight.w600, fontSize: 16)),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppTheme.primary,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.code, color: Colors.white, size: 16),
            ),
            const SizedBox(width: 8),
            const Text('Hackinder',
                style: TextStyle(fontWeight: FontWeight.bold)),
          ],
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: Row(
              children: [
                Text(
                  _onlineMode ? 'Global' : 'Nearby',
                  style: TextStyle(
                      color: _onlineMode ? AppTheme.accent : AppTheme.primary,
                      fontSize: 12, fontWeight: FontWeight.w600),
                ),
                const SizedBox(width: 6),
                Switch(
                  value: _onlineMode,
                  onChanged: (v) {
                    setState(() { _onlineMode = v; _currentIndex = 0; });
                    _loadFeed();
                  },
                  activeColor: AppTheme.accent,
                  inactiveThumbColor: AppTheme.primary,
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.logout, size: 20),
            onPressed: () async {
              await Supabase.instance.client.auth.signOut();
              if (mounted) {
                Navigator.pushReplacement(context,
                    MaterialPageRoute(builder: (_) => const AuthScreen()));
              }
            },
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(
          color: AppTheme.primary))
          : _matches.isEmpty
          ? _buildEmpty()
          : _currentIndex >= _matches.length
          ? _buildAllSwiped()
          : _buildFeed(),
    );
  }

  // ... [The rest of the UI build methods remain exactly the same as your source]
  Widget _buildFeed() {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            children: [
              Text(
                  '${_currentIndex + 1} of ${_matches.length} matches',
                  style: const TextStyle(
                      color: AppTheme.textSecondary, fontSize: 13)),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: _onlineMode
                      ? AppTheme.accent.withOpacity(0.15)
                      : AppTheme.primary.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  _onlineMode ? 'Global mode' : 'Nearby mode',
                  style: TextStyle(
                      color: _onlineMode ? AppTheme.accent : AppTheme.primary,
                      fontSize: 11, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: Dismissible(
            key: Key(_matches[_currentIndex].profile.id),
            onDismissed: (dir) {
              if (dir == DismissDirection.endToStart) _onSwipeLeft();
              else _onSwipeRight();
            },
            background: Container(
              margin: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.accent.withOpacity(0.2),
                borderRadius: BorderRadius.circular(24),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.start,
                children: [
                  SizedBox(width: 40),
                  Icon(Icons.favorite, color: AppTheme.accent, size: 40),
                  SizedBox(width: 8),
                  Text('Connect!',
                      style: TextStyle(color: AppTheme.accent,
                          fontWeight: FontWeight.bold, fontSize: 20)),
                ],
              ),
            ),
            secondaryBackground: Container(
              margin: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.danger.withOpacity(0.2),
                borderRadius: BorderRadius.circular(24),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Text('Skip',
                      style: TextStyle(color: AppTheme.danger,
                          fontWeight: FontWeight.bold, fontSize: 20)),
                  SizedBox(width: 8),
                  Icon(Icons.close, color: AppTheme.danger, size: 40),
                  SizedBox(width: 40),
                ],
              ),
            ),
            child: SingleChildScrollView(
              child: MatchCard(match: _matches[_currentIndex]),
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _actionButton(
                icon: Icons.close,
                color: AppTheme.danger,
                onTap: _onSwipeLeft,
                label: 'Skip',
              ),
              _actionButton(
                icon: Icons.favorite,
                color: AppTheme.accent,
                onTap: _onSwipeRight,
                label: 'Connect',
                large: true,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _actionButton({
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
    required String label,
    bool large = false,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          Container(
            width: large ? 64 : 52,
            height: large ? 64 : 52,
            decoration: BoxDecoration(
              color: color.withOpacity(0.15),
              shape: BoxShape.circle,
              border: Border.all(color: color.withOpacity(0.5)),
            ),
            child: Icon(icon, color: color, size: large ? 30 : 24),
          ),
          const SizedBox(height: 4),
          Text(label,
              style: TextStyle(color: color, fontSize: 11,
                  fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }

  Widget _buildEmpty() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.group_off,
              color: AppTheme.textSecondary, size: 64),
          const SizedBox(height: 16),
          const Text('No matches found',
              style: TextStyle(color: AppTheme.textPrimary,
                  fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          const Text('Try switching to Global mode',
              style: TextStyle(color: AppTheme.textSecondary)),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _loadFeed,
            style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary),
            child: const Text('Refresh',
                style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  Widget _buildAllSwiped() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.check_circle,
              color: AppTheme.accent, size: 64),
          const SizedBox(height: 16),
          const Text("You've seen everyone!",
              style: TextStyle(color: AppTheme.textPrimary,
                  fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: () => setState(() => _currentIndex = 0),
            style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary),
            child: const Text('Start Over',
                style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}