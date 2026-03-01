# Changelog

All notable changes to ImplantSnap are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/gcobc27746/implant-snap/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/gcobc27746/implant-snap/releases/tag/v1.0.0
