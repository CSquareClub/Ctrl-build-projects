import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../theme/app_theme.dart';

class ConnectionsScreen extends StatefulWidget {
  const ConnectionsScreen({super.key});

  @override
  State<ConnectionsScreen> createState() => _ConnectionsScreenState();
}

class _ConnectionsScreenState extends State<ConnectionsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isLoading = false;
  List<Map<String, dynamic>> _sent = [];
  List<Map<String, dynamic>> _received = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadConnections();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadConnections() async {
    setState(() => _isLoading = true);
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) { setState(() => _isLoading = false); return; }

    try {
      // Sent pitches — join receiver profile
      final sentRaw = await Supabase.instance.client
          .from('connections')
          .select('*, receiver:profiles!connections_receiver_id_fkey(full_name, github_username, primary_role, location)')
          .eq('sender_id', user.id)
          .order('created_at', ascending: false);

      // Received pitches — join sender profile
      final receivedRaw = await Supabase.instance.client
          .from('connections')
          .select('*, sender:profiles!connections_sender_id_fkey(full_name, github_username, primary_role, location)')
          .eq('receiver_id', user.id)
          .order('created_at', ascending: false);

      setState(() {
        _sent = List<Map<String, dynamic>>.from(sentRaw);
        _received = List<Map<String, dynamic>>.from(receivedRaw);
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _updateStatus(String connectionId, String status) async {
    await Supabase.instance.client
        .from('connections')
        .update({'status': status})
        .eq('id', connectionId);
    _loadConnections();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        backgroundColor: AppTheme.background,
        title: const Text('Connections',
            style: TextStyle(fontWeight: FontWeight.bold)),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppTheme.primary,
          labelColor: AppTheme.primary,
          unselectedLabelColor: AppTheme.textSecondary,
          tabs: [
            Tab(text: 'Sent (${_sent.length})'),
            Tab(text: 'Received (${_received.length})'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
          : TabBarView(
        controller: _tabController,
        children: [
          _buildSentList(),
          _buildReceivedList(),
        ],
      ),
    );
  }

  Widget _buildSentList() {
    if (_sent.isEmpty) return _buildEmpty('No pitches sent yet', 'Swipe right on the feed to connect!');
    return RefreshIndicator(
      onRefresh: _loadConnections,
      color: AppTheme.primary,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _sent.length,
        itemBuilder: (_, i) {
          final c = _sent[i];
          final profile = c['receiver'] as Map<String, dynamic>? ?? {};
          return _ConnectionCard(
            name: profile['full_name'] ?? 'Unknown',
            role: profile['primary_role'] ?? '',
            location: profile['location'] ?? '',
            github: profile['github_username'] ?? '',
            message: c['message'] ?? '',
            status: c['status'] ?? 'pending',
            showActions: false,
          );
        },
      ),
    );
  }

  Widget _buildReceivedList() {
    if (_received.isEmpty) return _buildEmpty('No pitches received yet', 'Your inbox is empty — check back soon!');
    return RefreshIndicator(
      onRefresh: _loadConnections,
      color: AppTheme.primary,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _received.length,
        itemBuilder: (_, i) {
          final c = _received[i];
          final profile = c['sender'] as Map<String, dynamic>? ?? {};
          return _ConnectionCard(
            name: profile['full_name'] ?? 'Unknown',
            role: profile['primary_role'] ?? '',
            location: profile['location'] ?? '',
            github: profile['github_username'] ?? '',
            message: c['message'] ?? '',
            status: c['status'] ?? 'pending',
            showActions: c['status'] == 'pending',
            onAccept: () => _updateStatus(c['id'], 'accepted'),
            onReject: () => _updateStatus(c['id'], 'rejected'),
          );
        },
      ),
    );
  }

  Widget _buildEmpty(String title, String subtitle) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.handshake_outlined,
              color: AppTheme.textSecondary, size: 56),
          const SizedBox(height: 16),
          Text(title,
              style: const TextStyle(color: AppTheme.textPrimary,
                  fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Text(subtitle,
              style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13)),
        ],
      ),
    );
  }
}

class _ConnectionCard extends StatelessWidget {
  final String name, role, location, github, message, status;
  final bool showActions;
  final VoidCallback? onAccept;
  final VoidCallback? onReject;

  const _ConnectionCard({
    required this.name,
    required this.role,
    required this.location,
    required this.github,
    required this.message,
    required this.status,
    required this.showActions,
    this.onAccept,
    this.onReject,
  });

  Color _statusColor() {
    switch (status) {
      case 'accepted': return AppTheme.accent;
      case 'rejected': return AppTheme.danger;
      default: return Colors.orange;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.06)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 22,
                backgroundColor: AppTheme.primary,
                child: Text(name.isNotEmpty ? name[0].toUpperCase() : '?',
                    style: const TextStyle(color: Colors.white,
                        fontWeight: FontWeight.bold, fontSize: 16)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(name,
                        style: const TextStyle(color: AppTheme.textPrimary,
                            fontWeight: FontWeight.w600, fontSize: 15)),
                    Text('$role · $location',
                        style: const TextStyle(color: AppTheme.textSecondary,
                            fontSize: 12)),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: _statusColor().withOpacity(0.15),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(status,
                    style: TextStyle(color: _statusColor(),
                        fontSize: 11, fontWeight: FontWeight.w600)),
              ),
            ],
          ),
          if (message.isNotEmpty) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.background,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text('"$message"',
                  style: const TextStyle(color: AppTheme.textSecondary,
                      fontSize: 13, fontStyle: FontStyle.italic,
                      height: 1.5)),
            ),
          ],
          if (showActions) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: onReject,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppTheme.danger,
                      side: BorderSide(color: AppTheme.danger.withOpacity(0.5)),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10)),
                    ),
                    child: const Text('Decline'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton(
                    onPressed: onAccept,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.accent,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10)),
                    ),
                    child: const Text('Accept',
                        style: TextStyle(color: Colors.white,
                            fontWeight: FontWeight.w600)),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}