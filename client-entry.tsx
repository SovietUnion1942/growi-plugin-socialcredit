// client-entry.tsx
// 部活信用評価システム: 申し立てフォームプラグイン(GROWI scriptプラグイン)

import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ReportForm } from './src/ReportForm';

// フォームを表示する固定ページのパス。決まったら書き換える。
const REPORT_FORM_PATH = '/社会信用体系';

const MOUNT_ELEMENT_ID = 'growi-plugin-report-root';

let root: Root | null = null;
let observer: MutationObserver | null = null;

function isReportPage(): boolean {
  return decodeURIComponent(window.location.pathname) === REPORT_FORM_PATH;
}

function mountForm() {
  if (!isReportPage()) return;

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
  root.render(<ReportForm />);
}

function unmountForm() {
  if (root != null) {
    root.unmount();
    root = null;
  }
  const container = document.getElementById(MOUNT_ELEMENT_ID);
  container?.remove();
}

function handleRouteChange() {
  if (isReportPage()) {
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
  observer = new MutationObserver(() => {
    if (isReportPage() && document.getElementById(MOUNT_ELEMENT_ID) == null) {
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
