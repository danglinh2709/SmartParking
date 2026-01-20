import easyocr
import cv2
import base64
import numpy as np
import re
from plate_detector import detect_plate

reader = easyocr.Reader(['en'], gpu=False)

def empty_result():
    return {
        "plate": "",
        "top": "",
        "bottom": "",
        "confidence": 0
    }

def smart_fix(t: str) -> str:
    """
    Fix OCR nhầm chữ ↔ số
    """
    return (
        t.replace("I", "1")
         .replace("L", "1")
         .replace("O", "0")
         .replace("D", "0")
         .replace("B", "8")
         .replace("S", "5")
    )

def read_plate(base64_img):
    try:
        # ===== 0. Validate =====
        if not base64_img or "," not in base64_img:
            return empty_result()

        # ===== 1. Decode =====
        img = cv2.imdecode(
            np.frombuffer(
                base64.b64decode(base64_img.split(",", 1)[1]),
                np.uint8
            ),
            cv2.IMREAD_COLOR
        )

        if img is None:
            return empty_result()

        # ===== 2. Detect plate =====
        plate_img = detect_plate(img)

        # fallback crop giữa ảnh
        if plate_img is None:
            h, w = img.shape[:2]
            plate_img = img[int(h*0.3):int(h*0.7),
                            int(w*0.2):int(w*0.8)]

        # ===== 3. OCR =====
        results = reader.readtext(plate_img, detail=1, paragraph=False)
        print("OCR PLATE:", results)

        top = ""
        bottom = ""
        confs = []

        for _, text, conf in results:
            raw = text.upper()
            t = re.sub(r"[^A-Z0-9]", "", raw)
            t = smart_fix(t)
            confs.append(conf)

            # ---- DÒNG TRÊN (chỉ cần >= 3 ký tự) ----
            if not top and re.search(r"\d[A-Z1]", t):
                top = t[:4]

            # ---- DÒNG DƯỚI (>= 3 số) ----
            elif not bottom and re.search(r"\d{3,}", t):
                bottom = t[-5:]

        if not top and not bottom:
            return empty_result()

        plate = f"{top}{bottom}"

        return {
            "plate": plate,
            "top": top,
            "bottom": bottom,
            "confidence": round(sum(confs)/len(confs), 3) if confs else 0
        }

    except Exception as e:
        print("OCR ERROR:", e)
        return empty_result()
