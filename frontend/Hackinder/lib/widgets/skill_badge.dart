import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class SkillBadge extends StatelessWidget {
  final String skill;
  final bool isVerified;

  const SkillBadge({
    super.key,
    required this.skill,
    this.isVerified = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: isVerified
            ? AppTheme.verified.withOpacity(0.15)
            : AppTheme.card,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isVerified
              ? AppTheme.verified.withOpacity(0.5)
              : Colors.white12,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (isVerified) ...[
            const Icon(Icons.verified, color: AppTheme.verified, size: 11),
            const SizedBox(width: 4),
          ],
          Text(
            skill,
            style: TextStyle(
              color: isVerified ? AppTheme.verified : AppTheme.textSecondary,
              fontSize: 11,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}