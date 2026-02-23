# Step 08：輸出檔案與 Sidecar JSON

## 目標

完成圖片與選配 JSON 的一致性輸出，並符合命名與儲存位置規範。

## 前置依賴

- `06-overlay-rendering-engine.md`
- `07-preview-and-confirm-flow.md`

## 實作清單

1. 實作 OutputService：
   - 根據設定輸出至使用者指定資料夾
   - 預設資料夾為桌面 `ScreenshotOutput`
2. 實作檔名產生器：
   - `YYYYMMDD_HHmmss_tooth21_4.0x13.0.png`
   - 防止同名覆蓋（必要時附加序號）
3. 實作 Sidecar JSON（選配）：
   - 與圖片同名 `.json`
   - 內容包含 `timestamp/tooth/diameter/length`
4. 實作寫入原子性：
   - 先寫暫存再 rename，降低半檔風險
5. 建立輸出成功通知與路徑回傳

## 交付物

- OutputService
- 圖片命名規則實作
- Sidecar JSON 輸出開關

## 驗收標準

- 圖片能正確寫入指定資料夾，檔名格式符合規格。
- 開啟 Sidecar 時，JSON 與圖片同名且內容一致。
- 取消流程（Preview Cancel）時，不得產生任何輸出檔。
