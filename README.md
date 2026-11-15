# バンドブラザー２（BandBrother2）

好きな曲の譜面をブラウザで作って共有し、1人プレイや、1台のPCでの2人対戦で遊べるWebリズムゲームです。
キーボードだけでなく、Joy-ConやWiiバランスボードでも遊べます。

- アプリ：https://frontend-ugx7tb3anq-an.a.run.app
- フロントエンドリポジトリ：https://github.com/ruirui23/BandBrother2-Frontend
- バックエンドリポジトリ：https://github.com/KOU050223/BandBrother2-Backend
- 作品紹介（Topaz）：https://topaz.dev/projects/1b35d74c2c47694f4ccf
- [Figma（アイデア・アーキテクチャ初期案・画面遷移など）](https://www.figma.com/board/miStDbGbn50Ogp68O5o9V3/%E3%82%AE%E3%82%AC%E3%81%AE%E3%81%A8?node-id=0-1&t=rgrioN6FLEvUgWJv-1)

![image](https://ptera-publish.topaz.dev/project/01JYB4QTQ9P495YKK963ZHKAD0.png)

![image](https://ptera-publish.topaz.dev/project/01JYB4QZPPMFWZ47R4SPQ39S4G.png)

## 作品の概要

### 主な機能

| 機能            | 内容                                                                                                       |
| --------------- | ---------------------------------------------------------------------------------------------------------- |
| 1人プレイ       | 4レーンに流れてくるノーツを、判定ラインに重なったタイミングで叩く。Perfect・Good・Missの3段階で判定        |
| ローカル2人対戦 | 1台のPCのキーボードを1P（Q/W/E/R）と2P（U/I/O/P）に分けて対戦。1Pと2Pで別々の難易度を選べる                |
| 譜面エディター  | 音楽を再生しながらレーンをクリックしてノーツを置く・消す。作った譜面は保存して、ほかのユーザーと共有できる |
| 設定            | キー配置、ノーツの速度（4段階）、縦画面・横画面の切り替え、効果音、レーンごとのノーツ判定調整              |
| 入力デバイス    | キーボード、Joy-Con（WebHID）、Wiiバランスボード（Raspberry Pi経由のWebSocket）                            |
| オンライン対戦  | Rails（マッチング）とGo（WebSocket）による対戦。※現在デプロイ環境では動作しません                          |

## 遊び方

※プレイと譜面作成にはログインが必要です。

1. ユーザー登録をする（メールアドレスまたはGitHub）
2. 「チュートリアル譜面で遊ぶ」から、1人プレイ・2人プレイを選んでやってみよう！
3. オリジナル譜面で遊ぶ
   1. 「カスタム譜面で遊ぶ」ボタンから遊ぶ
   2. 作られた曲から1人・2人を選択して遊ぼう！
4. オリジナル譜面を作る
   1. タイトル・BPMを入れよう！
   2. 作成したい曲を選択するか、自分で音源を入れよう！
   3. 「音源の長さに同期」を押すと、自動で長さを調整してくれます
   4. 譜面一覧から、これまで作った譜面を編集できます
5. 設定を変える
   - ホーム画面の「設定」ボタンから、キー配置・速度・縦横の切り替え・判定調整などを変更できます
6. マルチプレイで遊ぶ
   - 現在遊ぶことができません

## システム構成

```
ブラウザ（React）
 ├─ Firebase Authentication … ログイン（メール・GitHub）
 ├─ Firestore …………………… 譜面データ、譜面ごとのランキング
 ├─ Firebase Storage ………… アップロードされた楽曲の音声データ
 ├─ Rails API（Cloud Run）… ユーザー、マッチング、対戦結果の保存
 │    ├─ Cloud SQL（PostgreSQL）… ユーザー、ルーム、対戦履歴
 │    └─ Memorystore（Redis）…… マッチングキュー
 ├─ Go WebSocketサーバー（Cloud Run）… オンライン対戦中のリアルタイム通信
 ├─ Joy-Con ……………………… WebHIDでブラウザから直接接続
 └─ Wiiバランスボード …… Raspberry PiにBluetoothで接続し、WebSocketでブラウザに送信
```

フロントエンドは、GitHub Actionsで`main`へのマージをきっかけにDockerイメージをビルドし、Cloud Run（nginx）にデプロイしています。

## 使用技術

### フロントエンド

| 技術             | 用途                                   |
| ---------------- | -------------------------------------- |
| React 19         | UIの構築                               |
| Vite 6           | 開発サーバー・ビルド                   |
| TailwindCSS 4    | スタイリング                           |
| React Router 6   | 画面遷移、ログインが必要なページの保護 |
| Zustand 5        | スコア、縦画面・横画面の状態管理       |
| Howler.js        | 楽曲の再生と再生位置の取得             |
| Firebase SDK 11  | 認証、Firestore、Storage               |
| joy-con-webhid   | Joy-Conの接続                          |
| ESLint・Prettier | 静的解析・フォーマット                 |

### バックエンド

- Ruby on Rails v8.0.2（メインのAPIサーバー）
- Go v1.23.5（対戦用WebSocketサーバー）
  - gorilla/websocket v1.5.3
- PostgreSQL（ユーザー、ルーム、対戦履歴）
- Redis（マッチングキュー）

### インフラ

- Terraform
- GitHub Actions
- Google Cloud
  - Cloud Run（フロントエンド、Rails、Goサーバー）
  - Cloud SQL（PostgreSQL）
  - Memorystore（Redis）
  - Artifact Registry（Dockerイメージ）
- Firebase
  - Authentication（認証）
  - Firestore Database（譜面データ）
  - Firebase Storage（楽曲音声データ）

## 技術選定の理由

ハッカソンでは、メンバーが使いたい・学びたい技術を優先しました。モチベーションが高い方がチームの雰囲気が良くなり、短期間の成果につながるからです。

### React

画面を部品（コンポーネント）に分けて作れるので、ノーツ・判定ライン・譜面エディターのレーンなどを使い回しやすいためです。メンバーが学びたい技術だったことも理由です。

### Zustand

スコアや縦画面・横画面の状態は、離れたコンポーネント同士で共有する必要があります。Reduxはこの規模には記述が多く、React Contextは値が変わるたびにProviderの下がまとめて再描画されます。Zustandは、その値を使っているコンポーネントだけが再描画され、少ない記述で使えるので選びました。

### Howler.js

ブラウザごとの音声再生の違いを吸収してくれて、`seek()`で再生位置を取得できるためです。この再生位置を、ノーツの座標を計算する基準にしています。

### Firebase

- **Authentication**：メール認証とGitHub認証を短いコードで作れ、トークンの管理を任せられるため。
- **Firestore**：譜面は曲ごとにノーツの数や構造が大きく違うので、スキーマが柔軟なドキュメント型のデータベースが向いているため。
- **Storage**：ユーザーがアップロードした音源を、ダウンロードURLでそのまま再生できるため。

オンライン対戦の結果のように構造が決まったデータは、RailsとPostgreSQLで管理しています。

### Rails と Go を分けた理由

「状態を保存・管理するもの」と「低い遅延で同時接続をさばくもの」を分けました。

- **Rails**：ユーザー登録、マッチング、対戦結果の保存などのREST API。CRUDやデータベースまわりを速く作れるため。
- **Go**：対戦中のスコアのリアルタイム配信。goroutineで、多数の長い接続を軽く扱えるため。

### PostgreSQL と Redis

長く残す構造化データ（ユーザー、対戦履歴）はPostgreSQL、一時的なマッチング待ちは、読み書きが速いインメモリのRedisと、データの性質で使い分けました。

## ローカルでの起動方法

Node.js 22 で動作を確認しています。

```bash
git clone https://github.com/ruirui23/BandBrother2-Frontend.git
cd BandBrother2-Frontend
npm install
npm run dev
```

オンライン対戦を使う場合のみ、`.env.example`をコピーして`.env`を作り、RailsとGoのサーバーのURLを設定してください。それ以外の機能は、設定なしで動きます。

| コマンド         | 内容                                       |
| ---------------- | ------------------------------------------ |
| `npm run dev`    | 開発サーバーの起動                         |
| `npm run build`  | 本番用のビルド                             |
| `npm run lint`   | ESLintによる静的解析                       |
| `npm run format` | Prettierによる整形                         |
| `npm run ci`     | lintとフォーマットのチェックをまとめて実行 |

## ディレクトリ構成

```
src/
├── pages/       画面（URLごと）: プレイ、譜面エディター、ホームなど
├── components/  複数の画面で使う部品: ノーツ、判定ライン、設定画面など
├── hooks/       UIを持たないロジック: ゲームの進行、ゲームループ、Joy-Con接続
├── utils/       状態を持たない関数: 判定調整、スコア保存、効果音
├── context/     Wiiバランスボード連携の状態
├── store.js     Zustandのストア（スコア、縦画面・横画面）
└── firebase.js  Firebaseの初期化
```
