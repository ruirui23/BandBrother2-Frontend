# バンドブラザー２フロントエンドリポジトリ

https://bandbrother2-2764c.web.app

# フロントエンドリポジトリ

https://github.com/ruirui23/BandBrother2-Frontend

# バックエンドリポジトリ

https://github.com/KOU050223/BandBrother2-Backend

# 遊び方

1. ユーザー登録をする
2. チュートリアルとして上２つの1人プレイ・2人プレイがあるのでやってみよう！
3. オリジナル譜面で遊ぶ
   1. カスタム譜面で遊ぶボタンから遊ぶ
   2. 作られた曲から1人・2人を選択して遊ぼう！
4. オリジナル譜面作成
   1. タイトル・BPMを入れよう！
   2. 作成したい曲を選択or自分で入れよう！
   3. 音源の長さに同期を押したら自動で長さを調整してくれます
   4. 譜面一覧からこれまで作った曲から編集することができます
5. マルチプレイで遊ぶ
   1. 現在遊ぶことができません

# Topaz

https://topaz.dev/projects/1b35d74c2c47694f4ccf

# アイデアなど

[figma(アイデア・アーキテクチャ初期案・画面遷移など)](https://www.figma.com/board/miStDbGbn50Ogp68O5o9V3/%E3%82%AE%E3%82%AC%E3%81%AE%E3%81%A8?node-id=0-1&t=rgrioN6FLEvUgWJv-1)

# 使用技術

### フロント

- React
- TailwindCSS

### バックエンド

- Ruby on Rails v 8.0.2 (メインのAPIサーバー)
- Go v 1.23.5 (対戦用webソケットサーバー)
  - gorilla/websocket v1.5.3
- PostgreSQL (ユーザー、ルーム、対戦履歴)
- Redis (マッチングキュー)
### インフラ

- Terraform
- GithubActions
- GoogleCloud
  - CloudRun(Rails Goサーバー)
  - CloudSQL (PostgreSQL)
  -  Memorystore (Redis)
- firebase
  - Authentication　（認証）
  - Firestore Database （譜面データ）
  - Firebase Storage （楽曲音声データ）
  - Firebase Hosting （フロントデプロイ）

![image](https://ptera-publish.topaz.dev/project/01JYB4QTQ9P495YKK963ZHKAD0.png)

![image](https://ptera-publish.topaz.dev/project/01JYB4QZPPMFWZ47R4SPQ39S4G.png)