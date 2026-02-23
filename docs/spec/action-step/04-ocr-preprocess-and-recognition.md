# Step 04：OCR 前處理與辨識模組

## 目標

完成 `ocrTooth` 與 `ocrExtra` 兩區影像的前處理與 OCR 辨識，產生可供解析的原始文字結果。

## 前置依賴

- `02-capture-and-coordinate-pipeline.md`

## 實作清單

1. 建立 OCRService，輸入為兩個裁切影像 buffer。
2. 實作前處理管線（對兩區皆可套用）：
   - 灰階化
   - 對比增強
   - 放大 2x
   - 二值化
3. 整合 tesseract：
   - 針對 `ocrTooth` 取得 tooth 候選文字
   - 針對 `ocrExtra` 取得直徑/長度候選文字
4. 記錄 OCR 中間輸出（debug 模式）：
   - 前處理後影像（可選）
   - OCR 原始字串與信心值
5. 建立超時與失敗保護：
   - OCR 超時可中止，不可卡死整個流程

## 交付物

- OCRService
- 可配置的前處理參數
- OCR 失敗保護機制

## 驗收標準

- 以規格示例圖片可穩定輸出兩段 OCR 文字。
- OCR 單次失敗不造成程式崩潰，且有可追蹤錯誤訊息。
- 開啟 debug 時可取得中間處理結果以利調校。
