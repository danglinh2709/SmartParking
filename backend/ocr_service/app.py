from flask import Flask, request, jsonify
from plate_ocr import read_plate

app = Flask(__name__)
@app.route("/ocr", methods=["POST"])
def ocr_plate():
    try:
        data = request.get_json(force=True, silent=True)
        if not data or "image" not in data:
            return jsonify(default_response())

        result = read_plate(data["image"])


        return jsonify({
            "valid": bool(result["top"] or result["bottom"]),
            "plate": result["plate"],
            "top": result["top"],
            "bottom": result["bottom"],
            "confidence": result["confidence"]
        })

    except Exception as e:
        print("FLASK ERROR:", e)
        return jsonify(default_response())

def default_response():
    return {
        "valid": False,
        "plate": "",
        "top": "",
        "bottom": "",
        "confidence": 0
    }

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=6000)