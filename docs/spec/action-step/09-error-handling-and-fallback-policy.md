# Step 09：例外處理與降級策略

## 目標

定義並落實各類錯誤處理策略，確保流程可預期、可追蹤，且不因單點失敗導致整體不可用。

## 前置依賴

- `04-ocr-preprocess-and-recognition.md`
- `05-ocr-parser-and-data-contract.md`
- `08-output-and-sidecar-export.md`

## 實作清單

1. 錯誤分類與代碼化：
   - `OCR_FAILED`
   - `PARSE_INCOMPLETE`
   - `REGION_OUT_OF_BOUND`
   - `WRITE_FAILED`
2. 依規格實作策略：
   - OCR 失敗：顯示通知，可輸出無疊加圖片
   - 解析不完整：顯示錯誤，預設不儲存
   - 區域超界：阻止儲存設定
3. 加入「是否強制儲存」設定（針對解析不完整）
4. 實作 UI 通知層：
   - 成功、警告、錯誤三種提示樣式
5. 強化 log 與診斷資訊：
   - trace id、錯誤碼、步驟名稱、原始訊息

## 交付物

- 統一錯誤模型與錯誤碼表
- 降級策略實作
- 通知與 log 可觀測性

## 驗收標準

- 模擬各類錯誤時，系統行為符合既定策略。
- 任何錯誤都有對應錯誤碼與可讀提示文字。
- 不會出現無提示失敗或流程卡死狀況。
