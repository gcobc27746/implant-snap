# Step 02：全螢幕截圖與座標管線

## 目標

完成全螢幕擷取與 ROI（Region of Interest）裁切管線，確保所有後續處理都基於同一張像素座標系影像。

## 前置依賴

- `01-project-foundation-and-config-store.md`

## 實作清單

1. 實作 CaptureService：
   - 呼叫 `screenshot-desktop` 取得當前全螢幕影像
   - 以 buffer 形式回傳（避免中間落地檔案）
2. 建立影像座標模型：
   - 明確定義原點為左上角
   - 提供 `normalizeRegion()`、`clampRegionToImage()` 工具函式
3. 實作裁切服務（CropService）：
   - 依 `cropMain`, `ocrTooth`, `ocrExtra` 分別輸出影像 buffer
   - 使用 `sharp.extract`
4. 實作全域快捷鍵觸發（例如 `Ctrl + Shift + S`）：
   - 觸發後依序執行 capture → crop
5. 建立流程 trace id 與基礎 log：
   - 每次執行生成唯一 id，便於追蹤問題

## 交付物

- CaptureService 與 CropService
- 快捷鍵觸發可運作的最小流程（先不含 OCR）
- 可觀察的執行 log

## 驗收標準

- 按下快捷鍵後可取得全螢幕截圖且尺寸正確。
- `cropMain`, `ocrTooth`, `ocrExtra` 三區裁切結果尺寸符合設定值。
- 任一區域超界時可被攔截，流程不崩潰並回報錯誤原因。
