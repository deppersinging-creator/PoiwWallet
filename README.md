# PoiWallet

マスコット「ポイちゃん」と一緒に、ポイントカードと割引券をひとつにまとめる PWA（ホーム画面に追加できる Web アプリ）。

## 主な機能
- カード登録：店名・会員番号・コードの種類（Code128 / JAN(EAN-13) / EAN-8 / UPC / Code39 / ITF / Codabar(NW-7) / QR / Data Matrix / Aztec / PDF417）
- バーコード読み取り：カメラ、または写真から（BarcodeDetector 対応ブラウザはそれを使い、ほかは ZXing）
- レジ表示：白背景の大きなコード、画面スリープ防止、番号コピー
- 割引券：カードごとに複数登録、コード表示、使用済み管理、期限7日前に警告
- ポイント残高・有効期限、30日以内に失効する件数の警告
- ポイントの記録：レジ画面で「もらった／使った」を入力すると残高が自動で更新され、履歴（最大60件）と今月の増減が見られる。手で残高を直した分も「編集」として残る
- 色：10色のプリセット + カラーピッカー + RGB 数値入力
- 会員登録：メール認証 + パスワード（Supabase Auth）、パスワード再設定、アカウント削除
- 指紋・顔認証で開く（WebAuthn。端末内の生体認証を使用）
- クラウド同期（アカウント利用時）。未設定なら端末内のみで動作
- 12言語：英・日・簡体中・繁体中・韓・西・仏・独・葡・インドネシア・ヒンディー・アラビア（右から左の表示に対応）
- オフライン動作、ホーム画面への追加、バックアップの書き出し・読み込み
- 利用規約・プライバシー表記、ダークモード、キーボード操作、読み上げ対応

## ファイル
| ファイル | 内容 |
|---|---|
| `index.html` / `app.css` / `app.js` | アプリ本体 |
| `i18n.js` | 12言語の翻訳 |
| `config.js` | Supabase の URL とキー（空ならログインなしで動作） |
| `sw.js` / `manifest.webmanifest` / `icons/` | オフライン動作とインストール |
| `vendor/` | bwip-js（コード生成, MIT）、ZXing（読み取り, Apache-2.0）、supabase-js（MIT） |
| `supabase/schema.sql` | データベースの設定（テーブル、本人だけが読める制限、アカウント削除） |
| `build-preview.py` | Claude のプレビュー用ページを作るスクリプト |

## 公開手順
1. **Supabase**（無料枠あり）でプロジェクトを作成。リージョンは利用者に近い場所（日本向けなら Tokyo）。
2. SQL Editor で `supabase/schema.sql` を実行。
3. Authentication → Providers → Email で「Confirm email」をオン。Authentication → URL Configuration の Site URL と Redirect URLs に公開先 URL を登録。
4. Authentication → Emails でメール文面を日本語などに調整。本番では独自の SMTP（Resend など）を設定（Supabase 標準の送信は1時間あたりの上限が小さいため）。
5. Project Settings → API の URL と anon key を `config.js` に記入。
6. このフォルダを HTTPS のホスティング（GitHub Pages、Cloudflare Pages、Netlify など）にそのまま置く。ビルド作業は不要。
7. リリースのたびに `sw.js` の `VERSION` を上げる。

## 注意
- 公式アプリで数分ごとに変わるコード（使い捨て型）は登録できません。アプリ内にも明記しています。
- 生体認証は端末側で行い、指紋や顔のデータはアプリに届きません。
- 大きく公開する前に、利用規約とプライバシーポリシーを専門家に確認してもらうことをおすすめします。
