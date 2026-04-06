"""
focus_detect.py
---------------
Real-time focus monitoring using YOLOv8.

Tracks:
  - Class  0 : person
  - Class 67 : cell phone  ← triggers distraction alert

Controls:
  Press ESC to quit.
"""
import sys
import json
import base64
import numpy as np
import cv2
import time
from ultralytics import YOLO

# ──────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────
MODEL_PATH   = "yolov8n.pt"   # auto-downloaded on first run
TRACK_CLASSES = [0, 67]       # 0 = person, 67 = cell phone
WEBCAM_INDEX  = 0

# Distraction alert visual settings
ALERT_TEXT   = "DISTRACTION: PUT YOUR PHONE AWAY!"
ALERT_COLOR  = (0, 0, 255)    # BGR red
ALERT_FONT   = cv2.FONT_HERSHEY_DUPLEX
ALERT_SCALE  = 1.1
ALERT_THICK  = 3


def draw_alert(frame: cv2.Mat) -> None:
    """Overlay a large red warning banner at the top of the frame."""
    h, w = frame.shape[:2]
    # Semi-transparent dark background strip
    overlay = frame.copy()
    cv2.rectangle(overlay, (0, 0), (w, 65), (20, 0, 0), -1)
    cv2.addWeighted(overlay, 0.55, frame, 0.45, 0, frame)
    # Warning text
    cv2.putText(
        frame, ALERT_TEXT,
        (12, 47),
        ALERT_FONT, ALERT_SCALE,
        ALERT_COLOR, ALERT_THICK,
        cv2.LINE_AA,
    )


def main():
    print("🔍 Loading YOLOv8 model …")
    model = YOLO(MODEL_PATH)
    print(f"✅ Model loaded. Tracking classes: {TRACK_CLASSES} (person, cell phone)")

    cap = cv2.VideoCapture(WEBCAM_INDEX)
    if not cap.isOpened():
        raise RuntimeError(f"❌ Cannot open webcam index {WEBCAM_INDEX}")

    print("📷 Webcam started. Press ESC to quit.\n")
    window_name = "Focus Monitor – ESC to quit"
    cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)

    phone_start_time = None
    alert_triggered = False
    person_missing_start_time = None
    session_ended = False

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("⚠️  Frame read failed — camera may have disconnected.")
                break

            # ── Run inference (only tracking specified classes) ──
            results = model(frame, classes=TRACK_CLASSES, verbose=False)

            # ── Analyse detections ───────────────────────────────
            person_detected = False
            phone_detected = False
            for result in results:
                if result.boxes is None:
                    continue
                for box in result.boxes:
                    cls_id = int(box.cls[0].item())
                    if cls_id == 0:          # person
                        person_detected = True
                    elif cls_id == 67:       # cell phone
                        phone_detected = True

            # ── Render YOLOv8 bounding boxes onto frame ──────────
            annotated = results[0].plot()

            # ── Absence Logic ─────────────────────────────────────
            if not person_detected:
                if person_missing_start_time is None:
                    person_missing_start_time = time.time()
                
                missing_time = time.time() - person_missing_start_time
                cv2.putText(
                    annotated, f"User Missing: {int(missing_time)}s",
                    (12, 130),
                    cv2.FONT_HERSHEY_DUPLEX, 0.8,
                    (255, 0, 0), 2,
                    cv2.LINE_AA,
                )
                
                if missing_time >= 10:
                    if not session_ended:
                        print("🛑 FOCUS SESSION ENDED: User left the desk. 🛑")
                        session_ended = True
                    cv2.putText(
                        annotated, "SESSION ENDED",
                        (40, 200),
                        cv2.FONT_HERSHEY_DUPLEX, 2.0,
                        (0, 0, 255), 4,
                        cv2.LINE_AA,
                    )
            else:
                person_missing_start_time = None
                session_ended = False

            # ── Distraction alert ─────────────────────────────────
            if phone_detected:
                if phone_start_time is None:
                    phone_start_time = time.time()
                
                elapsed_time = time.time() - phone_start_time
                
                cv2.putText(
                    annotated, f"Warning: Phone detected for {int(elapsed_time)}s",
                    (12, 100),
                    cv2.FONT_HERSHEY_DUPLEX, 0.8,
                    (0, 255, 255), 2,
                    cv2.LINE_AA,
                )
                
                if elapsed_time >= 10:
                    if not alert_triggered:
                        print("🚨 DISTRACTION DETECTED: Put your phone away! 🚨")
                        alert_triggered = True
                    draw_alert(annotated)
            else:
                phone_start_time = None
                alert_triggered = False

            cv2.imshow(window_name, annotated)

            # ESC = 27
            if cv2.waitKey(1) & 0xFF == 27:
                print("👋 ESC pressed — exiting.")
                break

    finally:
        cap.release()
        cv2.destroyAllWindows()
        print("✅ Resources released. Goodbye!")


if __name__ == "__main__":
    main()


if _name_ == '_main_':
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument('--frame', type=str, required=True)  # base64 image
    args = parser.parse_args()

    # Decode the base64 frame back to an image
    img_bytes = base64.b64decode(args.frame)
    img_array = np.frombuffer(img_bytes, dtype=np.uint8)
    frame = cv2.imdecode(img_array, cv2.IMREAD_COLOR)

    # ── Call YOUR model's predict function here ───────────────
    # Replace these lines with however your model runs inference:
    result =draw_alert(frame)  # ← your function name here

    # Output must be JSON — Node.js reads this
    print(json.dumps({
        "present": bool(result['is_present']),
        "phone_detected": bool(result['phone_detected']),
        "confidence": float(result['confidence'])
    }))