# Chrome Web Store 公開用素材

## 必要な素材チェックリスト

### ✅ 完成済み
- [x] 拡張機能本体（manifest.json, content.js, styles.css）
- [x] アイコン（16x16, 32x32, 48x48, 128x128）
- [x] ストア説明文
- [x] プライバシーポリシー

### 📸 必要なスクリーンショット
Chrome Web Storeには以下のスクリーンショットが必要です：

1. **スクリーンショット**（1〜5枚）
   - サイズ: 1280x800 または 640x400
   - 形式: JPG または PNG（24bit、アルファチャンネルなし）
   - 内容:
     - Scrapページ全体と目次パネル
     - スクロール連動のハイライト
     - 折りたたんだ状態
     - ダークモード
     - モバイル表示

2. **プロモーション画像**（オプション）
   - 小タイル: 440x280
   - 大タイル: 920x680
   - マーキー: 1400x560

### 作成方法
1. ZennのScrapページで拡張機能を有効化
2. Chrome DevToolsで適切なサイズに調整
3. スクリーンショットを撮影
4. 必要に応じて画像編集

## ZIPファイルの作成

```bash
# 公開用ZIPファイルの作成
cd /Users/Ryota/_projects/zenn-scrap-toc
zip -r zenn-scrap-toc.zip manifest.json content.js styles.css icons/
```

## 公開手順

1. [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)にアクセス
2. 「新しいアイテム」をクリック
3. ZIPファイルをアップロード
4. 各種情報を入力:
   - 名前と説明
   - カテゴリ（生産性向上ツール）
   - 言語（日本語）
   - スクリーンショット
   - プライバシーポリシー設定
5. 「審査のため送信」をクリック

## 審査について
- 通常2〜3日で審査完了
- 週末は審査が遅れる可能性あり
- 問題があれば修正を求められる

## 公開後の管理
- ユーザーレビューの確認と返信
- バグ修正とアップデート
- 利用統計の確認