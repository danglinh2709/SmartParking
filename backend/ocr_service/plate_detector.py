import cv2
from ultralytics import YOLO

model = YOLO("yolov8n.pt")

def detect_plate(img):
    """
    Detect plate using YOLO.
    Trả về ảnh crop hoặc None
    """
    try:
        results = model.predict(
            source=img,
            conf=0.25,
            verbose=False,
            fuse=False
        )

        for r in results:
            if r.boxes is None:
                continue

            for box in r.boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                plate_img = img[y1:y2, x1:x2]
                if plate_img.size > 0:
                    return plate_img

    except Exception as e:
        print("YOLO ERROR (ignored):", e)

    return None
