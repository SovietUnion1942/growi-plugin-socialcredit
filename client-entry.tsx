// client-entry.tsx
// 部活信用評価システム: 申し立てフォームプラグイン(GROWI scriptプラグイン)

import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ReportForm } from './src/ReportForm';
import { ViewerEmbed } from './src/ViewerEmbed';

// フォームを表示する固定ページのパス。決まったら書き換える。
const REPORT_FORM_PATH = '/社会信用体系';

const MOUNT_ELEMENT_ID = 'growi-plugin-report-root';

let root: Root | null = null;
let observer: MutationObserver | null = null;

// GROWI v5以降、閲覧中のURLは常にページID形式のパーマリンク
// (例: /6a757f9ad0602496c26168fd)になる。
// そのため、パス文字列を直接 window.location.pathname と比較しても一致しない。
// 対象パス(REPORT_FORM_PATH)に対応するページIDをAPIで取得し、
// 現在のURLのIDと比較する方式に変更する。

let cachedTargetPageId: string | null | undefined; // undefined = 未取得, null = 見つからなかった

async function getTargetPageId(): Promise<string | null> {
  if (cachedTargetPageId !== undefined) return cachedTargetPageId;
  try {
    const res = await fetch(
      `/_api/v3/page?path=${encodeURIComponent(REPORT_FORM_PATH)}`,
      { credentials: 'include' },
    );
    if (!res.ok) {
      console.warn('[growi-plugin-report] target page not found yet (status', res.status, ')');
      cachedTargetPageId = null;
      return null;
    }
    const data = await res.json();
    const id: string | undefined = data?.page?._id ?? data?.page?.id;
    cachedTargetPageId = id ?? null;
    console.log('[growi-plugin-report] target page id:', cachedTargetPageId);
    return cachedTargetPageId;
  } catch (err) {
    console.error('[growi-plugin-report] getTargetPageId failed:', err);
    cachedTargetPageId = null;
    return null;
  }
}

function extractCurrentPageIdFromUrl(): string | null {
  const segments = window.location.pathname.split('/').filter(Boolean);
  const last = segments[segments.length - 1];
  // MongoDBのObjectId形式(24桁の16進数)かどうかを簡易チェック
  if (last != null && /^[0-9a-fA-F]{24}$/.test(last)) {
    return last;
  }
  return null;
}

async function isReportPage(): Promise<boolean> {
  // 保険として、万が一パス形式のURLで表示された場合にも対応する
  if (decodeURIComponent(window.location.pathname) === REPORT_FORM_PATH) {
    return true;
  }

  const currentId = extractCurrentPageIdFromUrl();
  if (currentId == null) return false;

  const targetId = await getTargetPageId();
  if (targetId == null) return false;

  return currentId === targetId;
}

async function mountForm() {
  if (!(await isReportPage())) return;

  let container = document.getElementById(MOUNT_ELEMENT_ID);
  if (container == null) {
    container = document.createElement('div');
    container.id = MOUNT_ELEMENT_ID;
    // GROWIの本文コンテナ(.wiki など)の先頭に差し込む。
    // 実際のDOM構造に合わせて調整が必要な場合がある。
    const target = document.querySelector('.wiki') ?? document.body;
    target.prepend(container);
  }

  if (root == null) {
    root = createRoot(container);
  }
  root.render(
    <>
      <ReportForm />
      <ViewerEmbed />
    </>,
  );
}

function unmountForm() {
  if (root != null) {
    root.unmount();
    root = null;
  }
  const container = document.getElementById(MOUNT_ELEMENT_ID);
  container?.remove();
}

async function handleRouteChange() {
  if (await isReportPage()) {
    mountForm();
  } else {
    unmountForm();
  }
}

const activate = (): void => {
  // 初回表示時のマウント
  mountForm();

  // GROWIはSPA的にページ遷移するため、URLの変化を監視して
  // 対象ページに入った/出たタイミングでフォームの表示を切り替える。
  // (history.pushState を横取りする方式)
  const originalPushState = history.pushState.bind(history);
  history.pushState = ((...args: Parameters<typeof history.pushState>) => {
    originalPushState(...args);
    handleRouteChange();
  }) as typeof history.pushState;

  window.addEventListener('popstate', handleRouteChange);

  // 保険として、本文コンテナの差し替えをMutationObserverでも検知する
  observer = new MutationObserver(async () => {
    if (document.getElementById(MOUNT_ELEMENT_ID) == null && (await isReportPage())) {
      mountForm();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
};

const deactivate = (): void => {
  unmountForm();
  window.removeEventListener('popstate', handleRouteChange);
  observer?.disconnect();
  observer = null;
};

if ((window as any).pluginActivators == null) {
  (window as any).pluginActivators = {};
}
(window as any).pluginActivators['growi-plugin-report'] = {
  activate,
  deactivate,
};
