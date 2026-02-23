# Step 01：專案骨架與設定儲存

## 目標

建立 Electron 基礎執行環境、系統匣常駐生命週期與設定儲存機制，讓後續模組可共享統一的設定資料來源。

## 前置依賴

- 無（起始步驟）

## 實作清單

1. 建立 Electron 主程序與 renderer 基礎結構，完成可啟動桌面視窗。
2. 安裝並初始化核心套件：
   - `electron-store`
   - `screenshot-desktop`
   - `sharp`
   - `tesseract`（本機 OCR 依賴）
3. 定義設定檔 schema（至少包含）：
   - `screenWidth`, `screenHeight`
   - `previewEnabled`
   - `regions.cropMain`, `regions.ocrTooth`, `regions.ocrExtra`, `regions.overlayAnchor`
4. 實作設定存取服務（ConfigService）：
   - `load()`, `save()`, `validate()`, `reset()`
5. 加入座標合法性檢查：
   - `x,y,width,height` 需為正整數（anchor 可僅 `x,y`）
   - 不可超出當前螢幕解析度
6. 實作「解析度變更偵測」：
   - 啟動時比對 `screenWidth/screenHeight`
   - 不一致時標記設定為需重新定義
7. 實作系統匣常駐行為（AppLifecycleService）：
   - 主視窗 `close` 事件改為 `hide()`，不結束 app
   - 建立 Tray 圖示與 tooltip
   - Tray 右鍵選單包含：`設定`、`關閉`
   - `關閉` 才呼叫 `app.quit()` 真正退出
8. 實作系統匣互動開窗：
   - 雙擊 Tray 圖示可開啟並聚焦 Config 視窗
   - 點擊 Tray 選單 `設定` 可開啟並聚焦 Config 視窗
9. 實作退出保護旗標：
   - 僅在使用者點擊 Tray `關閉` 時允許通過 `before-quit/close` 流程，避免誤退出

## 交付物

- 可啟動的 Electron app
- 系統匣常駐與退出控制模組
- 設定存取與驗證模組
- 預設設定檔產生流程

## 驗收標準

- 首次啟動可成功建立設定檔並寫入預設值。
- 手動輸入不合法座標時，`save()` 會拒絕並回傳錯誤訊息。
- 修改螢幕解析度後重啟，系統可正確提示需重新定義區域。
- 點擊主視窗關閉按鈕後，程式仍常駐系統匣且行程不結束。
- 右鍵 Tray 選單點 `關閉` 才會真正退出程式。
- 雙擊 Tray 或點 `設定` 可重新開啟並聚焦 Config 頁面。
