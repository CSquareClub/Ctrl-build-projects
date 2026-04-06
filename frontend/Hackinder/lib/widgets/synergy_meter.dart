import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import 'dart:math' as math;

class SynergyMeter extends StatelessWidget {
  final int score;
  final double size;

  const SynergyMeter({
    super.key,
    required this.score,
    this.size = 70,
  });

  Color get _color {
    if (score >= 80) return AppTheme.accent;
    if (score >= 60) return AppTheme.primary;
    if (score >= 40) return Colors.orange;
    return AppTheme.danger;
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        alignment: Alignment.center,
        children: [
          CustomPaint(
            size: Size(size, size),
            painter: _ArcPainter(
              score: score,
              color: _color,
            ),
          ),
          Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                '$score%',
                style: TextStyle(
                  color: _color,
                  fontSize: size * 0.22,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text(
                'synergy',
                style: TextStyle(
                  color: AppTheme.textSecondary,
                  fontSize: size * 0.12,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ArcPainter extends CustomPainter {
  final int score;
  final Color color;

  _ArcPainter({required this.score, required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 - 6;
    final strokeWidth = 5.0;

    final bgPaint = Paint()
      ..color = Colors.white12
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    canvas.drawCircle(center, radius, bgPaint);

    final fgPaint = Paint()
      ..color = color
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final sweepAngle = 2 * math.pi * (score / 100);
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -math.pi / 2,
      sweepAngle,
      false,
      fgPaint,
    );
  }

  @override
  bool shouldRepaint(_ArcPainter old) => old.score != score;
}