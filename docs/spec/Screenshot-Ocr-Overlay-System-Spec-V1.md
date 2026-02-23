# 全螢幕截圖自動裁切與資訊疊加系統規格書

版本：v1.0
技術架構：Electron + GitHub Releases AutoUpdater
座標系統：影像像素座標（Pixel-based Absolute Coordinates）

---

# 一、系統目標

本系統為桌面應用程式，提供使用者透過全螢幕截圖，依事先定義之像素座標範圍，自動完成：

1. 主要畫面裁切
2. 指定區域 OCR 文字辨識
3. 解析特定資訊（tooth、種植體直徑、種植體長度）
4. 將資訊以指定樣式疊加於輸出圖片
5. 儲存至指定資料夾

使用者僅需於初次設定時定義座標範圍，後續可透過快捷鍵一鍵完成全流程。

---

# 二、系統架構

## 2.1 技術架構

* Runtime：Electron
* 打包工具：electron-builder
* 自動更新：electron-updater（GitHub Releases）
* 截圖：screenshot-desktop
* 影像處理：sharp
* OCR：tesseract（本機）
* 設定儲存：electron-store
* UI 框選工具：Canvas + Konva.js

---

# 三、功能模組說明

## 3.1 截圖模組（Capture Module）

功能：

* 以全螢幕模式擷取目前螢幕影像
* 輸出 PNG 原始圖檔（記憶體中處理）

輸出：

* fullScreenshot.png

注意事項：

* 所有座標皆以該張截圖之實際像素解析度為基準

---

## 3.2 設定模式（Configuration Mode）

使用者可於此模式下定義：

### 3.2.1 定義項目

1. 主裁切區域（cropMain）
2. OCR 區域 - Tooth（ocrTooth）
3. OCR 區域 - 附加信息（ocrExtra）
4. 疊加文字位置（overlayAnchor）

所有區域皆以：

x, y, width, height

絕對像素座標儲存。

範例：

```json
{
   "cropMain":  { "x": 720,  "y": 90,  "width": 980, "height": 920 },
   "ocrTooth": { "x": 1080, "y": 120, "width": 160, "height": 90  },
   "ocrExtra": { "x": 1180, "y": 700, "width": 520, "height": 360 },
   "overlayAnchor": { "x": 760, "y": 120 }
}
```

說明：

* x,y 為左上角像素座標
* width,height 為區域尺寸
* overlayAnchor 為文字疊加起始點

---

## 3.3 執行模式（Execution Mode）

觸發方式：

* 全域快捷鍵（例如 Ctrl + Shift + S）

流程：

1. 全螢幕截圖
2. 依 cropMain 進行裁切
3. 依 ocrTooth 裁切 Tooth OCR 區域 → 執行 OCR
4. 依 ocrExtra 裁切 附加信息 OCR 區域 → 執行 OCR
5. 解析 tooth、直徑、長度
6. 產生疊加字串
7. 疊加至裁切圖
8. 預覽確認（Preview & Confirm）

   * 顯示預覽視窗（包含輸出圖片與解析到的文字）
   * 使用者可選擇：確認存檔 / 取消
   * 提供「下次不再顯示（Skip Preview）」勾選項
9. 儲存輸出（若取消則不儲存）

---

# 四、OCR 解析規則

## 4.1 OCR 區域與職責

本系統包含兩個 OCR 區域：

1. ocrTooth：用於辨識牙位（Tooth）
2. ocrExtra：用於辨識附加信息（種植體直徑、種植體長度）

兩區域 OCR 結果將合併後進行解析。

## 4.2 目標資訊

需辨識資訊如下：

1. Tooth（牙位）
2. 種植體直徑（Diameter）
3. 種植體長度（Length）

範例目標輸出：

21 ( 4.0 x 13.0 )

---

## 4.3 解析邏輯

### Tooth Regex（來源：ocrTooth）

\b(1[1-8]|2[1-8]|3[1-8]|4[1-8])\b

### Diameter x Length Regex（來源：ocrExtra）

(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)

OCR 前處理流程：

* 灰階化
* 對比拉高
* 放大 2x
* 二值化

解析後資料格式：

```json
{
   "tooth": "21",
   "diameter": "4.0",
   "length": "13.0"
}
```

---

# 五、疊加渲染規格

## 5.1 疊加字串模板

格式固定為：

{{tooth}} ( {{diameter}} x {{length}} )

範例：

21 ( 4.0 x 13.0 )

---

## 5.2 字型與樣式

* 字型：內嵌字型（打包於 resources）
* 字級：28px（可於設定檔調整）
* 字色：白色
* 背景：黑色半透明底框
* 內距：8px
* 圓角：8px

影像合成方式：

* 使用 sharp composite
* SVG 作為文字圖層

---

# 六、輸出規格

## 6.1 儲存位置

* 使用者指定資料夾
* 預設為桌面 ScreenshotOutput

## 6.2 檔名規則

YYYYMMDD_HHmmss_tooth21_4.0x13.0.png

## 6.3 Sidecar JSON（選配）

與圖片同名 .json 檔：

```json
{
   "timestamp": "2026-02-23T19:20:00",
   "tooth": "21",
   "diameter": "4.0",
   "length": "13.0"
}
```

## 6.4 預覽確認設定（Preview Setting）

* previewEnabled（boolean）

  * true：每次流程完成後顯示預覽確認視窗
  * false：完成後直接儲存

* 使用者於預覽視窗可勾選「下次不再顯示（Skip Preview）」

  * 勾選後將 previewEnabled 設為 false
  * 可於設定頁面重新開啟

---

# 七、設定檔儲存位置

儲存於：

app.getPath('userData')

Profile 範例：

```json
{
   "screenWidth": 1920,
   "screenHeight": 1080,
   "previewEnabled": true,
   "regions": {
      "cropMain": { "x": 720, "y": 90, "width": 980, "height": 920 },
      "ocrTooth": { "x": 1080, "y": 120, "width": 160, "height": 90 },
      "ocrExtra": { "x": 1180, "y": 700, "width": 520, "height": 360 },
      "overlayAnchor": { "x": 760, "y": 120 }
   }
}
```

若解析度變更，需重新定義。

---

# 八、例外處理

1. OCR 未辨識成功

   * 顯示通知
   * 仍輸出圖片（無疊加）

2. 解析資料不完整

   * 顯示錯誤提示
   * 不儲存檔案（可設定是否強制儲存）

3. 座標超出影像範圍

   * 阻止儲存設定

---

# 九、未來擴充方向

* 支援多 Profile
* 支援多 OCR 區域
* 支援不同模板
* 支援批次處理
* 支援自動監控模式
