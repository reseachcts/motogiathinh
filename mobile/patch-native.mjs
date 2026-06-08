// Inject native config that Capacitor's regenerated projects don't carry.
// Idempotent — safe to run after every `cap add` / `cap sync`.
//
// iOS: a fresh Info.plist has NO privacy usage strings, so the app crashes the
// moment it touches the camera or photo library. This adds the required keys.
// Android: camera works via the system-camera intent (no permission needed) and
// the ML Kit model is already bundled — nothing to patch.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLIST = path.join(__dirname, "ios", "App", "App", "Info.plist");

const KEYS = {
  NSCameraUsageDescription:
    "Ứng dụng cần dùng camera để chụp ảnh giấy tờ và quét mã QR trên CCCD.",
  NSPhotoLibraryUsageDescription:
    "Ứng dụng cần truy cập thư viện ảnh để chọn ảnh giấy tờ học viên.",
  NSPhotoLibraryAddUsageDescription:
    "Ứng dụng cần quyền lưu ảnh giấy tờ vào thư viện.",
};

if (!fs.existsSync(PLIST)) {
  console.log("patch-native: no ios/ project yet — run `npx cap add ios` first (skipping).");
  process.exit(0);
}

let xml = fs.readFileSync(PLIST, "utf8");
let added = [];
for (const [key, val] of Object.entries(KEYS)) {
  if (xml.includes(`<key>${key}</key>`)) continue;
  // insert before the final </dict>
  const entry = `\t<key>${key}</key>\n\t<string>${val}</string>\n`;
  const idx = xml.lastIndexOf("</dict>");
  xml = xml.slice(0, idx) + entry + xml.slice(idx);
  added.push(key);
}
if (added.length) {
  fs.writeFileSync(PLIST, xml);
  console.log("patch-native (iOS): added", added.join(", "));
} else {
  console.log("patch-native (iOS): usage strings already present — nothing to do.");
}
