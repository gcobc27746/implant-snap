# Step 05：OCR 解析器與資料契約

## 目標

將 OCR 原始文字解析為結構化資料 `{ tooth, diameter, length }`，並建立格式一致的資料契約供後續渲染與輸出使用。

## 前置依賴

- `04-ocr-preprocess-and-recognition.md`

## 實作清單

1. 實作 Tooth Regex：
   - `\b(1[1-8]|2[1-8]|3[1-8]|4[1-8])\b`
2. 實作 Diameter x Length Regex：
   - `(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)`
3. 建立 ParserService：
   - 輸入：`ocrToothText`, `ocrExtraText`
   - 輸出：`{ tooth, diameter, length } | ParseError`
4. 實作標準化規則：
   - `x/X/×` 統一為 `x`
   - 數字統一保留小數格式（如 `4` → `4.0`，規則可配置）
5. 加入資料完整性檢查與錯誤分類：
   - tooth 缺失
   - 直徑/長度缺失
   - 多重候選衝突

## 交付物

- ParserService
- 資料契約型別定義
- 解析錯誤碼定義

## 驗收標準

- 範例輸入可正確解析為 `21 / 4.0 / 13.0`。
- 模糊或缺失資料可回傳明確錯誤碼，不得靜默失敗。
- 下游模組可只依賴資料契約，不需關注 OCR 原始格式。
