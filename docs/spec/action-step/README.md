# Screenshot OCR Overlay 實作步驟總覽

本資料夾將 `Screenshot-Ocr-Overlay-System-Spec-V1.md` 拆解為可逐步落地的實作計畫。  
每個檔案代表一個可獨立執行與驗收的步驟，建議依序完成。

## 執行順序

1. `01-project-foundation-and-config-store.md`
2. `02-capture-and-coordinate-pipeline.md`
3. `03-configuration-workbench-ui.md`
4. `04-ocr-preprocess-and-recognition.md`
5. `05-ocr-parser-and-data-contract.md`
6. `06-overlay-rendering-engine.md`
7. `07-preview-and-confirm-flow.md`
8. `08-output-and-sidecar-export.md`
9. `09-error-handling-and-fallback-policy.md`
10. `10-e2e-verification-and-release-readiness.md`

## 應用程式生命週期規則（新增）

- 關閉主視窗（標題列 X）時，預設行為為「隱藏至系統匣」，不得直接結束程式。
- 僅有系統匣圖示右鍵選單中的「關閉」可真正退出程式。
- 使用者雙擊系統匣圖示或點選系統匣「設定」時，必須重新開啟並聚焦 Config 頁面。
- 系統匣常駐狀態下，全域快捷鍵仍可正常觸發執行流程。

## UI 風格基準（套用於所有有畫面的步驟）

- 參考文件：`docs/ui/configuration.html`、`docs/ui/preview-widget.html`
- 色彩：`primary #137fec`、深色背景 `#101922`、淺色背景 `#f6f7f8`
- 元件語言：圓角卡片、細邊框、淺陰影、狀態色（成功/警示/錯誤）
- 字體與圖示：`Inter` + `Material Symbols Outlined`
- 互動：按鈕有 hover/active、輸入欄有 focus ring、主要操作需具明確主次層級

## 文件欄位說明

- **目標**：此步驟的完成定義
- **前置依賴**：必須先完成的步驟或條件
- **實作清單**：具體要做的工程項目
- **交付物**：預期產出
- **驗收標準**：可測、可判定的通過條件
