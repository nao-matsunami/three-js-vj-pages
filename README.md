# Three.js VJ Site

Three.jsで、毎日ループする3D VJ素材を公開する静的サイトです。

This first version is a frame: it has the daily data, export controls, purchase-link slot, and publishing workflow. The preview renderer is WebGL-based and ready to be replaced with full Three.js scene modules.

## Run

```sh
python3 -m http.server 4204
```

Open `http://localhost:4204/`.

## Daily Publish

```sh
npm run daily:publish
```

日付指定:

```sh
npm run daily:update -- --date=2026-08-08
npm run publish:pages
```

## Sales Links

映像データの購入先が決まったら、`data/purchase.json` を更新します。
