const fs = require("fs");
const path = require("path");

function saveBase64Image(base64, folder, filename) {
  const matches = base64.match(/^data:image\/\w+;base64,(.+)$/);
  if (!matches) throw new Error("Ảnh base64 không hợp lệ");

  const data = matches[1];
  const dir = path.join(__dirname, "..", "uploads", folder);

  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, filename + ".jpg");
  fs.writeFileSync(filePath, Buffer.from(data, "base64"));

  return filePath.replace(/\\/g, "/");
}

module.exports = { saveBase64Image };
