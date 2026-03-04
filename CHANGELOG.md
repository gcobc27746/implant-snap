# Changelog

All notable changes to ImplantSnap are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.9] - 2026-03-04

### Changed
- 輸出檔名格式改為 `螢幕擷取畫面 YYYY-MM-DD HHmmss.png`

## [1.0.8] - 2026-03-03

### Fixed
- 備註框編輯模式中 Enter 鍵改為換行（原為結束編輯），Escape 鍵結束編輯

## [1.0.7] - 2026-03-03

### Added
- 預覽視窗支援多備註框：下拉選單選取預設備註（含 `[空白]`）後按「新增」加入圖上備註框
- 備註框支援拖曳移動、拖曳 8 方向角點縮放字體大小
- 雙擊備註框進入內嵌編輯模式（Enter 或 Escape 結束），右上角圓形 × 按鈕可刪除
- 選取狀態才顯示邊框、8 個編輯點與 × 按鈕；未選取時僅顯示文字
- 備註輸出無背景底色，採文字描邊（stroke）保持可讀性
- 設定頁可新增 / 編輯 / 刪除備註預設文字

### Fixed
- 快速連按 `Ctrl+Shift+S` 不再重複觸發截圖流程（新增 pipeline 執行鎖，同時保護系統匣截圖入口）

## [1.0.0] - 2026-03-01

### Added
- 全螢幕截圖（`Ctrl+Shift+S` 或系統匣按鈕）
- 自動 OCR 辨識牙位編號、植體長度、直徑（Tesseract chi_sim）
- 疊加文字浮水印至裁切圖像（Sharp + SVG）
- 預覽視窗：確認或修正 OCR 結果再存檔
- 輸出存檔（PNG）+ 可選 JSON sidecar
- 系統匣常駐、多螢幕選擇支援
- 植體選擇表格圖像分析（TableAnalyzer）
- 組合驗證：依 Ostem TSIII 規格校驗有效 (直徑 × 長度) 組合
- OCR 無效組合時自動採用表格分析結果修正（含 leading-digit dropout 修正）
- 自動更新（electron-updater，每小時背景偵測，GitHub Releases）
- 設定畫面：拖曳定義各裁切區域、顯示選取之螢幕截圖

[Unreleased]: https://github.com/gcobc27746/implant-snap/compare/v1.0.9...HEAD
[1.0.9]: https://github.com/gcobc27746/implant-snap/compare/v1.0.8...v1.0.9
[1.0.8]: https://github.com/gcobc27746/implant-snap/compare/v1.0.7...v1.0.8
[1.0.7]: https://github.com/gcobc27746/implant-snap/compare/v1.0.0...v1.0.7
[1.0.0]: https://github.com/gcobc27746/implant-snap/releases/tag/v1.0.0
