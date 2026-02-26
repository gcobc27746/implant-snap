# ImplantSnap Release Checklist

版本：`v1.0.0`  
更新日期：`2026-02-26`

## 1) 發佈前檢查

- [ ] `npm run typecheck` 通過
- [ ] `npm run build` 通過
- [ ] 正常路徑 E2E（capture → OCR → parse → overlay → preview → save）通過
- [ ] Skip Preview 路徑通過
- [ ] OCR 失敗 / 解析不完整降級策略驗證通過
- [ ] 系統匣行為符合規格（關閉主窗不退出、Tray 關閉才退出）
- [ ] 輸出 PNG 檔名格式符合規格
- [ ] Sidecar JSON（若啟用）內容一致

## 2) 發佈設定

- [x] `electron-builder` 可打包（`dist:win`）
- [x] 已加入 `electron-updater`
- [x] `package.json > build.publish` 設定 GitHub provider
- [ ] GitHub Release Draft 建立
- [ ] 釋出說明（變更摘要 / 已知限制）完成

## 3) 回滾方案

1. 於 GitHub Releases 將新版本標記為停止發佈或下架。
2. 重新發佈上一個穩定版本為最新 release。
3. 若已大量更新，透過公告提醒使用者手動安裝穩定版。

## 4) 已知限制

- 開發模式下會略過 `electron-updater` 更新檢查（僅打包後有效）。
- 若 `previewEnabled=false`，完整流程會直接輸出，不再顯示預覽視窗。
