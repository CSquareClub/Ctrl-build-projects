import time
import cv2
import requests
import numpy as np
from flask import Flask, Response, jsonify
from flask_cors import CORS
from ultralytics import YOLO
import threading

app = Flask(__name__)
CORS(app)

MODEL_PATH = "yolov8n.pt"
TRACK_CLASSES = [0, 67]  # 0 = person, 67 = cell phone
WEBCAM_INDEX = 0

NODE_BACKEND_URL = "http://localhost:3000/api/distraction"

# ── Session State ────────────────────────────────────────
session_active = False
session_lock = threading.Lock()

# ── Camera Thread State ──────────────────────────────────
# Camera only opens when a session starts, closes when it ends.
cam_thread = None
cam_thread_lock = threading.Lock()

print("🔍 Loading YOLOv8 model …")
model = YOLO(MODEL_PATH)
print(f"✅ Model loaded. Tracking classes: {TRACK_CLASSES} (person, cell phone)")

ALERT_TEXT = "DISTRACTION: PUT YOUR PHONE AWAY!"
ALERT_COLOR = (0, 0, 255)
ALERT_FONT = cv2.FONT_HERSHEY_DUPLEX
ALERT_SCALE = 1.1
ALERT_THICK = 3

# ── Thresholds ───────────────────────────────────────────
PHONE_THRESHOLD_SEC = 5           # kill session after 5s of phone
PERSON_MISSING_THRESHOLD_SEC = 10
PHONE_WARN_INTERVAL_SEC = 2       # warn every 2s while phone is visible

# ── Performance tuning ───────────────────────────────────
INFERENCE_EVERY_N = 1       # run model on EVERY frame for best accuracy
INFERENCE_SIZE = 640        # full resolution for best detection

# ── Shared frame for web stream ──────────────────────────
latest_frame = None
latest_frame_lock = threading.Lock()

# ── Idle placeholder frame (camera off) ──────────────────
def make_idle_frame():
    """Generate a dark placeholder frame with 'Camera Off' text."""
    img = np.zeros((480, 640, 3), dtype=np.uint8)
    cv2.putText(img, "Camera Off — No Active Session",
                (60, 240), cv2.FONT_HERSHEY_DUPLEX, 0.7,
                (80, 80, 80), 2, cv2.LINE_AA)
    _, buf = cv2.imencode(".jpg", img)
    return bytearray(buf)

idle_frame = make_idle_frame()


def draw_alert(frame):
    h, w = frame.shape[:2]
    overlay = frame.copy()
    cv2.rectangle(overlay, (0, 0), (w, 65), (20, 0, 0), -1)
    cv2.addWeighted(overlay, 0.55, frame, 0.45, 0, frame)
    cv2.putText(frame, ALERT_TEXT, (12, 47),
                ALERT_FONT, ALERT_SCALE, ALERT_COLOR, ALERT_THICK, cv2.LINE_AA)


def camera_loop():
    """
    Runs in a background thread. Opens the camera, runs YOLOv8 inference,
    reports distractions to the Node backend, and writes encoded frames
    to `latest_frame` for the web stream.

    Exits (and releases the camera) when `session_active` becomes False.
    """
    global session_active, latest_frame

    print("🎥 [Flask] Camera thread started — opening webcam...")

    cap = cv2.VideoCapture(WEBCAM_INDEX, cv2.CAP_DSHOW)
    if not cap.isOpened():
        print(f"⚠️  DirectShow failed, trying default backend...")
        cap = cv2.VideoCapture(WEBCAM_INDEX)
        if not cap.isOpened():
            print(f"❌ Cannot open webcam index {WEBCAM_INDEX} at all.")
            return

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    cap.set(cv2.CAP_PROP_FPS, 30)

    phone_start_time = None
    alert_triggered = False
    last_kill_time = None
    last_warn_time = None
    person_missing_start_time = None

    frame_count = 0
    last_person_detected = False
    last_phone_detected = False
    last_annotated = None

    try:
        while True:
            # ★ Check if session is still active — if not, exit the loop
            with session_lock:
                if not session_active:
                    print("⏹️  [Flask] Session ended — camera thread stopping.")
                    break

            ret, frame = cap.read()
            if not ret:
                time.sleep(0.05)
                continue

            frame_count += 1
            run_inference = (frame_count % INFERENCE_EVERY_N == 0)

            if run_inference:
                results = model(frame, classes=TRACK_CLASSES, verbose=False, imgsz=INFERENCE_SIZE)
                person_detected = False
                phone_detected = False

                for result in results:
                    if result.boxes is None:
                        continue
                    for box in result.boxes:
                        cls_id = int(box.cls[0].item())
                        if cls_id == 0:
                            person_detected = True
                        elif cls_id == 67:
                            phone_detected = True

                last_person_detected = person_detected
                last_phone_detected = phone_detected
                last_annotated = results[0].plot()
            else:
                person_detected = last_person_detected
                phone_detected = last_phone_detected
                if last_annotated is None:
                    last_annotated = frame.copy()

            annotated = last_annotated if run_inference else frame.copy()

            # ── Person missing logic ──
            if not person_detected:
                if person_missing_start_time is None:
                    person_missing_start_time = time.time()
                missing_time = time.time() - person_missing_start_time
                cv2.putText(annotated, f"User Missing: {int(missing_time)}s",
                            (12, 130), cv2.FONT_HERSHEY_DUPLEX, 0.8,
                            (255, 0, 0), 2, cv2.LINE_AA)

                if missing_time >= PERSON_MISSING_THRESHOLD_SEC:
                    print("🛑 FOCUS SESSION ENDED: User left the desk. 🛑")
                    try:
                        requests.post(NODE_BACKEND_URL, json={'reason': 'user_missing'}, timeout=2)
                    except Exception as e:
                        print("Backend request failed:", e)
                    cv2.putText(annotated, "SESSION ENDED", (40, 200),
                                cv2.FONT_HERSHEY_DUPLEX, 2.0, (0, 0, 255), 4, cv2.LINE_AA)
                    with session_lock:
                        session_active = False
                    person_missing_start_time = None
            else:
                person_missing_start_time = None

            # ── Phone detection logic ──
            if phone_detected:
                if phone_start_time is None:
                    phone_start_time = time.time()
                    last_warn_time = time.time()
                elapsed_time = time.time() - phone_start_time
                remaining = max(0, PHONE_THRESHOLD_SEC - elapsed_time)

                # Countdown bar on screen
                bar_w = int((remaining / PHONE_THRESHOLD_SEC) * 300)
                cv2.rectangle(annotated, (12, 60), (12 + 300, 80), (40, 40, 40), -1)
                cv2.rectangle(annotated, (12, 60), (12 + bar_w, 80), (0, 200, 255), -1)
                cv2.putText(annotated, f"PHONE! Terminating in {remaining:.1f}s",
                            (12, 100), cv2.FONT_HERSHEY_DUPLEX, 0.8,
                            (0, 255, 255), 2, cv2.LINE_AA)

                # ★ Alarm every 2 seconds — notify backend to buzz the user
                if last_warn_time is None or (time.time() - last_warn_time >= PHONE_WARN_INTERVAL_SEC):
                    last_warn_time = time.time()
                    print(f"⚠️  Phone warning alarm! ({int(elapsed_time)}s / {PHONE_THRESHOLD_SEC}s)")
                    try:
                        requests.post(NODE_BACKEND_URL, json={'reason': 'phone_warning'}, timeout=1)
                    except:
                        pass

                if elapsed_time >= PHONE_THRESHOLD_SEC:
                    if not alert_triggered or (last_kill_time and time.time() - last_kill_time > PHONE_THRESHOLD_SEC):
                        print("🚨 DISTRACTION DETECTED: Session killed! 🚨")
                        alert_triggered = True
                        last_kill_time = time.time()
                        try:
                            requests.post(NODE_BACKEND_URL, json={'reason': 'phone_kill_session'}, timeout=2)
                        except Exception as e:
                            print("Backend request failed:", e)
                        with session_lock:
                            session_active = False
                    draw_alert(annotated)
            else:
                phone_start_time = None
                last_warn_time = None
                alert_triggered = False

            # Encode and store latest frame
            flag, encoded = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 70])
            if flag:
                with latest_frame_lock:
                    latest_frame = bytearray(encoded)

            time.sleep(0.01)
    finally:
        cap.release()
        # ★ Set latest_frame back to idle placeholder after camera closes
        with latest_frame_lock:
            latest_frame = None
        print("📷 [Flask] Camera released.")


def start_camera_thread():
    """Spawn the camera loop thread if one isn't already running."""
    global cam_thread
    with cam_thread_lock:
        if cam_thread is not None and cam_thread.is_alive():
            print("[Flask] Camera thread already running, skipping spawn.")
            return
        cam_thread = threading.Thread(target=camera_loop, daemon=True)
        cam_thread.start()


def generate_web_stream():
    """Yields JPEG frames for the /video_feed MJPEG stream."""
    while True:
        with latest_frame_lock:
            frame_bytes = latest_frame

        if frame_bytes is not None:
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        else:
            # No camera running — send idle placeholder
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + idle_frame + b'\r\n')

        time.sleep(0.05)  # ~20 FPS cap for web stream


# ── Routes ───────────────────────────────────────────────

@app.route('/video_feed')
def video_feed():
    return Response(generate_web_stream(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')


@app.route('/start_session', methods=['POST'])
def start_session():
    global session_active
    with session_lock:
        session_active = True
    # ★ Spin up the camera thread now (not at boot)
    start_camera_thread()
    print("✅ [Flask] Session STARTED — camera + AI detection ACTIVE")
    return jsonify({'status': 'session_started'}), 200


@app.route('/stop_session', methods=['POST'])
def stop_session():
    global session_active
    with session_lock:
        session_active = False
    # The camera_loop will detect session_active=False and exit on its own
    print("⏹️  [Flask] Session STOPPED — camera will close shortly")
    return jsonify({'status': 'session_stopped'}), 200


@app.route('/session_status', methods=['GET'])
def session_status():
    with session_lock:
        active = session_active
    return jsonify({'session_active': active}), 200


if __name__ == '__main__':
    print("🚀 Flask AI service ready on http://localhost:5000")
    print("   Camera is OFF until a session is started.")
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
