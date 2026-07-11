# TOEIC Master v5.1 Online — 登入修正版

## 本次修正
- 移除會蓋住 Firebase 登入畫面的舊版「暱稱登入」視窗。
- Google 登入失敗時直接顯示 Firebase 錯誤原因。
- Popup 被封鎖時改用 Redirect 登入。
- 登入成功但 Firestore 規則錯誤時，會清楚顯示錯誤。
- 更新 Service Worker，避免 GitHub Pages 一直讀到舊版快取。

## 更新方式
1. 解壓縮。
2. 將資料夾內所有檔案上傳 GitHub，覆蓋舊檔。
3. 等 Pages 部署完成後，以 Ctrl+F5 強制重新整理。
4. 若仍顯示舊畫面，清除該網站的瀏覽資料後重開。

## Firebase 必要設定
- Authentication > 登入方式：Google 與匿名已啟用。
- Authentication > 設定 > 已授權的網域：加入 `juansammi.github.io`。
- Firestore Rules：貼上 `firestore.rules` 並發布。
