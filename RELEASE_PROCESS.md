# リリースプロセス

## バージョン更新のタイミング

バージョンは[Semantic Versioning](https://semver.org/lang/ja/)に従います。

### パッチバージョン（x.x.Z）を更新する場合
- バグ修正
- ドキュメントの更新
- アイコンやスタイルの小さな変更
- 既存機能の微調整

### マイナーバージョン（x.Y.x）を更新する場合
- 新機能の追加
- 既存機能の大幅な改善
- 下位互換性を保ちつつの変更

### メジャーバージョン（X.x.x）を更新する場合
- 下位互換性を破る変更
- 大規模なリファクタリング
- 基本的な動作の変更

## リリース手順

### 1. バージョン番号の更新
以下のファイルでバージョンを更新：

```bash
# manifest.json
"version": "x.x.x"

# content.js (2箇所)
// Version: x.x.x
console.log('[Zenn Scrap TOC] Extension loaded - vx.x.x');
panel.dataset.version = 'x.x.x';
```

### 2. CHANGELOGの更新
`CHANGELOG.md`に変更内容を記載：

```markdown
## [x.x.x] - YYYY-MM-DD

### 追加
- 新機能の説明

### 変更
- 変更内容の説明

### 修正
- バグ修正の説明
```

### 3. コミットとタグ付け

```bash
# 変更をステージング
git add -A

# コミット（Conventional Commitsに従う）
git commit -m "chore: release vx.x.x

- 変更内容のサマリー
- 関連するIssue番号"

# プッシュ
git push origin main

# タグを作成
git tag -a vx.x.x -m "Release vx.x.x - リリース概要"

# タグをプッシュ
git push origin vx.x.x
```

### 4. ZIPファイルの作成

```bash
# リリース用ZIPを作成
zip -r zenn-scrap-toc-vx.x.x.zip manifest.json content.js styles.css icons/*.png -x "*.DS_Store"
```

### 5. GitHubリリースの作成

```bash
# GitHub CLIを使用
gh release create vx.x.x \
  --title "vx.x.x - リリースタイトル" \
  --notes "リリースノートの内容" \
  zenn-scrap-toc-vx.x.x.zip
```

または、GitHubのWebインターフェースから：
1. Releasesページへ移動
2. "Create a new release"をクリック
3. タグを選択
4. リリースノートを記入
5. ZIPファイルを添付
6. "Publish release"をクリック

### 6. Chrome Web Storeの更新（該当する場合）

1. [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)にアクセス
2. 拡張機能を選択
3. 新しいZIPファイルをアップロード
4. 変更内容を記入
5. 審査のため送信

## チェックリスト

リリース前に確認すること：

- [ ] すべてのテストが通過している
- [ ] バージョン番号が全ファイルで一致している
- [ ] CHANGELOGが更新されている
- [ ] READMEが最新の情報を反映している
- [ ] 新機能のドキュメントが追加されている
- [ ] 既知の問題がCHANGELOGに記載されている
- [ ] ZIPファイルに必要なファイルのみが含まれている
- [ ] GitHubのIssueが適切にクローズされている

## リリース頻度のガイドライン

- **パッチリリース**: 必要に応じて（バグ修正は速やかに）
- **マイナーリリース**: 2-4週間ごと（機能が蓄積したら）
- **メジャーリリース**: 3-6ヶ月ごと（大きな変更がある場合のみ）

## 注意事項

- Chrome Web Storeへの申請は審査に2-3営業日かかる
- 緊急のバグ修正はホットフィックスとして別ブランチから行う
- リリースノートは日本語で記載（ターゲットユーザーが日本人のため）