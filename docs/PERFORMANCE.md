# パフォーマンス最適化ガイド

このドキュメントでは、本プロジェクトで実装されているパフォーマンス最適化手法について説明します。

## 実装済みの最適化

### 1. コード分割（Code Splitting）

#### 動的インポート
- `ResultsDisplay`コンポーネントを動的インポートにより遅延読み込み
- 初期表示に不要なコンポーネントを別チャンクに分割
- ローディング状態の表示によりUXを維持

```typescript
const ResultsDisplay = dynamic(() => import('@/components/ResultsDisplay'), {
  loading: () => <LoadingComponent />,
  ssr: false,
})
```

#### 効果
- 初期バンドルサイズの削減
- 必要な時のみコンポーネントを読み込み
- ページ読み込み速度の向上

### 2. 画像・アセット最適化

#### Next.js Image最適化
- `next.config.js`で画像最適化設定を有効化
- AVIF/WebP形式の自動変換
- レスポンシブ画像サイズの自動生成
- キャッシュTTLの設定

#### SVGアイコンの最適化
- インラインSVGを使用してHTTPリクエストを削減
- 最小限のSVGコードでレンダリング

### 3. CDNとキャッシング戦略

#### 静的アセットのキャッシング
- 静的ファイル: `max-age=31536000, immutable`（1年間）
- APIエンドポイント: `max-age=0, must-revalidate`（常に再検証）

#### Next.js静的生成
- ページを静的生成（Static Generation）でプリレンダリング
- ビルド時にHTMLを生成してCDN配信
- サーバー負荷の削減と応答速度の向上

#### Vercel CDN
- Vercelデプロイ時に自動でグローバルCDN配信
- エッジネットワークによる高速配信
- 自動的なGzip/Brotli圧縮

### 4. フォント最適化

#### Google Fonts最適化
- `next/font/google`による自動最適化
- フォントのプリロード有効化
- フォールバックフォントの設定
- レイアウトシフトの防止

```typescript
const notoSans = Noto_Sans_JP({
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'arial'],
  adjustFontFallback: true,
})
```

### 5. ビルド最適化

#### SWC Minify
- Rust製の高速コンパイラー（SWC）によるminify
- JavaScript/TypeScriptの最適化

#### 圧縮
- Gzip圧縮の有効化
- 静的アセットの圧縮による転送量削減

#### パッケージ最適化
- Tree-shakingによる不要コードの削除
- パッケージの自動最適化（実験的機能）

### 6. HTTP/2 とプリフェッチ

#### リソースヒント
- DNSプリフェッチ（`dns-prefetch`）
- プリコネクト（`preconnect`）で接続を事前確立
- Next.jsによる自動的なリソースヒント生成

## パフォーマンス指標

### 目標値
- **Lighthouse Performance Score**: 90以上
- **First Contentful Paint (FCP)**: 1.8秒以下
- **Largest Contentful Paint (LCP)**: 2.5秒以下
- **Time to Interactive (TTI)**: 3.8秒以下
- **Total Blocking Time (TBT)**: 200ms以下
- **Cumulative Layout Shift (CLS)**: 0.1以下

### 現在のバンドルサイズ（ビルド時）
- **メインページ**: 19.8 kB
- **First Load JS**: 107 kB
- **共有チャンク**: 87.3 kB

## 測定方法

### ビルド分析
```bash
npm run build:analyze
```

### Lighthouse測定
1. Chrome DevToolsを開く
2. Lighthouseタブを選択
3. Performanceオプションを選択
4. 測定を実行

### Web Vitals測定
```bash
npm install @next/bundle-analyzer
```

## 今後の改善案

### 優先度: 高
- [ ] Service Workerの導入（PWA化）
- [ ] クリティカルCSSの抽出
- [ ] バンドルサイズのさらなる削減

### 優先度: 中
- [ ] React Server Componentsの活用
- [ ] Streaming SSRの実装
- [ ] 画像の遅延読み込み

### 優先度: 低
- [ ] HTTP/3対応
- [ ] 部分的なプリレンダリング
- [ ] エッジ関数の活用

## 参考資料

- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Web Vitals](https://web.dev/vitals/)
- [Vercel Speed Insights](https://vercel.com/docs/analytics/package)

