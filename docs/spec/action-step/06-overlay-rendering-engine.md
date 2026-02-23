# Step 06：疊加渲染引擎

## 目標

依指定模板與樣式，將解析結果渲染到主裁切圖上，產生最終可預覽的輸出影像。

## 前置依賴

- `02-capture-and-coordinate-pipeline.md`
- `05-ocr-parser-and-data-contract.md`

## 實作清單

1. 建立 OverlayService：
   - 輸入：`cropMain buffer`、`overlayAnchor`、解析資料
   - 輸出：合成後圖片 buffer
2. 套用模板：
   - `{{tooth}} ( {{diameter}} x {{length}} )`
3. 文字圖層渲染：
   - 使用 SVG 生成文字底框與字串
   - 字型採內嵌字型（resources）
4. 合成規格：
   - 字級 28px（可配置）
   - 白字 + 黑色半透明底框
   - 內距 8px、圓角 8px
   - 以 `sharp.composite` 合成
5. 建立無疊加 fallback：
   - 解析失敗時可回傳原主裁切圖供後續流程判斷

## 交付物

- OverlayService
- 可配置樣式參數
- 合成後影像輸出

## 驗收標準

- 成功案例中疊加文字位置與內容正確。
- 不同字串長度下底框不破版、不裁切文字。
- 解析失敗時可依策略輸出無疊加影像且流程不中斷。
