// src/ViewerEmbed.tsx
// 対象者向け確認・反論サイトをiframeで埋め込む(埋め込み不可ならリンクにフォールバック)
import React, { useState } from 'react';

// report-viewer-site のURL(開発中はローカル)
const VIEWER_URL = 'http://localhost:5174';

export function ViewerEmbed() {
  const [embedFailed, setEmbedFailed] = useState(false);

  return (
    <div className="growi-plugin-report-viewer-embed" style={{ marginTop: 24 }}>
      <h3>申し立て確認・反論</h3>

      {!embedFailed && (
        <iframe
          src={VIEWER_URL}
          title="申し立て確認・反論"
          style={{ width: '100%', height: 480, border: '1px solid #ddd', borderRadius: 8 }}
          onError={() => setEmbedFailed(true)}
        />
      )}

      {embedFailed && (
        <p>
          埋め込み表示ができませんでした。
          <a href={VIEWER_URL} target="_blank" rel="noreferrer">
            こちらから開いてください
          </a>
        </p>
      )}

      <p style={{ fontSize: '0.85rem', color: '#666' }}>
        表示されない場合は
        <a href={VIEWER_URL} target="_blank" rel="noreferrer">別タブで開く</a>
        こともできます。
      </p>
    </div>
  );
}
