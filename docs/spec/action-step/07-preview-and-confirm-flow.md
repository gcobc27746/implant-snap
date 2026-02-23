# Step 07：預覽確認流程（Preview & Confirm）

## 目標

在儲存前提供預覽與人工修正入口，並支援「下次不再顯示」設定。

## 前置依賴

- `05-ocr-parser-and-data-contract.md`
- `06-overlay-rendering-engine.md`
- `01-project-foundation-and-config-store.md`

## 實作清單

1. 建立預覽對話視窗（參考 `docs/ui/preview-widget.html`）：
   - 顯示輸出影像
   - 顯示可編修欄位：tooth / diameter / length
2. 實作操作按鈕：
   - `Save & Export`：確認後繼續儲存
   - `Cancel`：中止此次流程，不落地檔案
3. 實作 `Skip Preview next time`：
   - 勾選即將 `previewEnabled` 寫入 `false`
   - 設定頁可重新開啟
4. 實作資料回寫：
   - 使用者在預覽修改文字後，應回寫到最終輸出資料物件
5. 加入鍵盤操作：
   - Enter 觸發儲存
   - Esc 觸發取消

## 畫面風格要求

- 依 `docs/ui/preview-widget.html` 的 modal 規格
- 主 CTA 使用 primary 色
- 表單與提示文字需可讀、層級明確
- 支援 dark mode 顯示一致性

## 交付物

- 預覽確認視窗
- 可編修欄位與確認流程
- Skip Preview 設定開關

## 驗收標準

- `previewEnabled=true` 時每次執行都會顯示預覽。
- 使用者修改欄位後儲存，最終輸出反映修改值。
- 勾選 Skip 後，下次執行不顯示預覽並直接儲存。
