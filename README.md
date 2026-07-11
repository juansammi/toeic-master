# TOEIC Master v6.0

## 內容
- 內建單字：559 筆
- 文法題：83 題
- 單字來源：原有字庫＋你上傳的 TOEIC 分類單字 PDF，已去重整理。

## 這版最重要的改變
- 全部舊登入程式已移除，只保留單一 `app.js`
- Google 登入失敗時可以直接進入「離線模式」，所以你一定能自己玩
- 登入錯誤會直接顯示診斷資訊
- 文法答完顯示詳解及下一題
- 配對遊戲、排行榜、投稿、隊伍與管理員審核
- PWA 手機安裝與離線快取

## GitHub 更新
解壓縮後，把資料夾裡所有檔案上傳並覆蓋舊檔。舊的 `script.js`、`online.js`、`firebase-config.js` 不要保留。

## Firebase 必做
1. Authentication → 已授權網域加入 `juansammi.github.io`
2. Firestore → 規則：貼上 `firestore.rules` 全文並發布
3. 若 Google 登入仍顯示 `auth/api-key-not-valid`，這是 Firebase 專案的 Web API Key 本身失效，請在 Firebase「專案設定 → 一般 → 你的 Web App」重新複製 config，替換 `app.js` 最上方的 CONFIG。

## 管理員
目前管理員信箱：`s111001@hcvs.hc.edu.tw`
