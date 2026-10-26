/* Experimental: call only after choosing a real HTTPS WordPress companion URL. */
export function mountCoreFeed(container, companionUrl) {
  const url = new URL(companionUrl);
  if (url.protocol !== 'https:') throw new Error('An HTTPS WordPress URL is required.');
  url.search = '?school-core-feed=1';
  url.hash = '';
  const frame = document.createElement('iframe');
  frame.title = 'Publications Instagram de Juste Debout School CORE';
  frame.loading = 'lazy';
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  frame.style.cssText = 'width:100%;height:650px;border:0;display:block';
  const onMessage = (event) => {
    if (event.origin !== url.origin || event.source !== frame.contentWindow) return;
    const data = event.data;
    if (!data || data.type !== 'jds-core-feed-height' || !Number.isInteger(data.height)) return;
    if (data.height < 1 || data.height > 20000) return;
    frame.style.height = `${data.height}px`;
  };
  window.addEventListener('message', onMessage);
  frame.src = url.href;
  container.appendChild(frame);
  return () => { window.removeEventListener('message', onMessage); frame.remove(); };
}
