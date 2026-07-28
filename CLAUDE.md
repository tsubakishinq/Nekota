# Nekota リポジトリ メモ

## 返信フォーマットの約束（ユーザー指示）
- **毎回、返信の最後に確認用URLを太字で必ず添付する。**
  - ユーザーは「指示通りに作った結果」をタップして確認したいため。
  - 対象の公開URL: **https://tsubakishinq.github.io/Nekota/**
  - 公開サイト（GitHub Pages）は既定ブランチ `claude/dev-capabilities-w0cmzb` から配信される。
    作業ブランチの変更を公開URLに反映するにはデプロイ（マージ）が必要。

## リポジトリ構成
- ルート `index.html` = 「窓口管理」（接骨院向け受付・スケジュール管理アプリ）。データは localStorage 保存。
  - 主なキー: `sekkotsu_patients` / `sekkotsu_records` / `sekkotsu_schedules` /
    `sekkotsu_attend_flags` / `sekkotsu_deleted_nums` / `sekkotsu_resets` ほか
  - `INITIAL_PATIENTS` に実際の患者名簿を保持し、番号が無ければ自動再登録する。
    手動削除した番号は `sekkotsu_deleted_nums` に記録して復活を防ぐ。
- `/game/` = 子ども向けゲーム集メニュー、各ゲームは各フォルダの `index.html`。
- `窓口管理_Ver6.300.html` = 窓口管理のバージョン付きアーカイブ（原則触らない）。

## 作業ブランチ
- 開発・プッシュ先: `claude/nekota-fixes-features-30u9re`
