// src/ReportForm.tsx
import React, { useEffect, useState } from 'react';

// 申し立て管理APIのベースURル。開発中はローカルのAPIサーバーを指す。
// 本番運用時は環境に合わせて書き換える。
const API_BASE_URL = 'http://localhost:3001';

let cachedUsername: string | null = null;

async function getCurrentUsername(): Promise<string | null> {
  if (cachedUsername != null) return cachedUsername;
  try {
    const res = await fetch('/_api/v3/personal-setting', { credentials: 'include' });
    const data = await res.json();
    console.log('[growi-plugin-report] personal-setting response:', data);
    cachedUsername = data.currentUser?.username ?? null;
    return cachedUsername;
  } catch (err) {
    console.error('[growi-plugin-report] getCurrentUsername failed:', err);
    return null;
  }
}

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

async function submitReport(params: {
  reporter_name: string;
  target_name: string;
  content: string;
}): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return { ok: false, message: errBody.error ?? `送信に失敗しました (${res.status})` };
    }

    return { ok: true, message: '申請を送信しました' };
  } catch (err) {
    console.error('[growi-plugin-report] submitReport failed:', err);
    return { ok: false, message: 'APIサーバーに接続できませんでした' };
  }
}

export function ReportForm() {
  const [reporterName, setReporterName] = useState<string | null>(null);
  const [targetName, setTargetName] = useState('');
  const [content, setContent] = useState('');
  const [state, setState] = useState<SubmitState>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    getCurrentUsername().then((username) => {
      setReporterName(username);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reporterName) {
      setState('error');
      setMessage('ログインユーザーを取得できませんでした。ログインし直してください。');
      return;
    }
    if (!targetName.trim() || !content.trim()) {
      setState('error');
      setMessage('対象者と内容は必須です。');
      return;
    }

    setState('submitting');
    const result = await submitReport({
      reporter_name: reporterName,
      target_name: targetName.trim(),
      content: content.trim(),
    });

    if (result.ok) {
      setState('success');
      setMessage(result.message);
      setTargetName('');
      setContent('');
    } else {
      setState('error');
      setMessage(result.message);
    }
  };

  return (
    <div className="growi-plugin-report-form" style={{ maxWidth: 560, margin: '0 auto' }}>
      <h2>社会信用体系</h2>

      <p>
        申し立て人:{' '}
        {reporterName === null ? <em>取得中...</em> : <strong>{reporterName}</strong>}
      </p>

      <form onSubmit={handleSubmit}>
        <div className="form-group mb-3">
          <label htmlFor="target_name">対象者(GROWIユーザー名)</label>
          <input
            id="target_name"
            type="text"
            className="form-control"
            value={targetName}
            onChange={(e) => setTargetName(e.target.value)}
            placeholder="例: taro_yamada"
          />
        </div>

        <div className="form-group mb-3">
          <label htmlFor="content">申請内容</label>
          <textarea
            id="content"
            className="form-control"
            rows={6}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="具体的に何が起きたかを記入してください"
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={state === 'submitting'}>
          {state === 'submitting' ? '送信中...' : '申請を送信'}
        </button>
      </form>

      {message && (
        <p style={{ marginTop: 12, color: state === 'error' ? 'crimson' : 'green' }}>
          {message}
        </p>
      )}
    </div>
  );
}
