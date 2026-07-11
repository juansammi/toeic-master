# TOEIC Master v5 Online

## 已加入
- Google／匿名登入
- Firestore 使用者資料與 XP 排行榜
- 共用單字投稿與管理員審核
- 共用單字庫
- 建立／加入學習隊伍
- 建立／加入線上對戰房間（MVP 房間同步）
- 管理員後台統計
- 保留 v4.1 單字、文法、配對遊戲、收藏與錯題功能

## 上線前必做
1. Firebase Console → Authentication → 設定 → 已授權網域，新增 `juansammi.github.io`。
2. Firebase Console → Firestore → 規則，把 `firestore.rules` 全部貼上並「發布」。
3. 若管理員不是 `s111001@hcvs.hc.edu.tw`，同時修改：
   - `firebase-config.js` 的 `ADMIN_EMAIL`
   - `firestore.rules` 裡的管理員信箱
4. 解壓縮後，把所有檔案覆蓋上傳至 GitHub；不要只傳 ZIP。

## 說明
- 目前對戰已完成房間與玩家即時同步，正式逐題競速可在下一版加上伺服端防作弊與題目狀態機。
- Firebase 前端 config 可以公開；不要上傳 Service Account 私鑰。
