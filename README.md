# TOEIC Master v7.0

## 這版修正
- 移除舊的 `script.js`、`online.js` 與重複登入流程。
- Firebase 設定只由 `firebase-config.js` 管理。
- 新增網站內「Firebase 連線設定／診斷」。
- 可直接測試 API Key；若 Key 失效，可貼入最新 firebaseConfig 儲存後重新載入。
- Google 登入失敗時仍可使用完整離線模式。
- 登出後確實回到登入畫面。
- Service Worker 改為網路優先並強制清除舊快取。

## 上傳 GitHub
先刪除儲存庫根目錄的舊檔，再上傳本資料夾全部檔案。尤其不要保留：
- script.js
- online.js

## Firebase
1. Authentication 已授權網域需有 `juansammi.github.io`。
2. Firestore → 規則：貼上 `firestore.rules` 並發布。
3. 網頁若顯示 API Key 無效，按登入畫面的「Firebase 連線設定／診斷」，貼上 Firebase Console 最新 config，再按「測試 API Key」。

## 說明
目前你提供的 API Key 會被 Google Identity Toolkit 回報無效；這是 Firebase/Google Cloud 專案端的 Key 狀態，不是前端 JavaScript 能偽造修好的。v7 已讓你不必改程式碼即可替換並測試新 Key。
