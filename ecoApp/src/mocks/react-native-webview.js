// Web stub for react-native-webview.
// Uses srcdoc (no blob-URL restrictions) and postMessage (no eval/CSP issues).
import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { View } from 'react-native';

const WebView = forwardRef(function WebView(
  { source, style, onLoad, onMessage },
  ref,
) {
  const containerRef = useRef(null);
  const iframeRef    = useRef(null);

  useImperativeHandle(ref, () => ({
    injectJavaScript: (js) => {
      try { iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ __eval: js }), '*'); } catch (_) {}
    },
    postMessage: (msg) => {
      try { iframeRef.current?.contentWindow?.postMessage(msg, '*'); } catch (_) {}
    },
  }));

  // Receive messages FROM the iframe and forward to onMessage
  useEffect(() => {
    if (!onMessage) return;
    const handler = (e) => {
      if (iframeRef.current && e.source !== iframeRef.current.contentWindow) return;
      onMessage({ nativeEvent: { data: e.data } });
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onMessage]);

  // Create the iframe imperatively and append to the container DOM node
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !source?.html) return;

    // Make container a positioning context so absolute iframe fills it
    container.style.position = 'relative';
    container.style.overflow = 'hidden';

    const iframe = document.createElement('iframe');
    // Use absolute positioning — height:100% inside a flex item is unreliable
    Object.assign(iframe.style, {
      position: 'absolute',
      top: '0', left: '0', right: '0', bottom: '0',
      width: '100%', height: '100%',
      border: 'none',
    });
    // allow-same-origin required for CORS tile/API requests from inside the iframe
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-forms');
    iframe.title = 'map';
    iframe.srcdoc = source.html;
    iframe.onload = onLoad ?? null;
    iframeRef.current = iframe;

    container.appendChild(iframe);

    return () => {
      if (container.contains(iframe)) container.removeChild(iframe);
    };
  }, [source?.html]);

  return (
    <View
      ref={containerRef}
      style={[style, { overflow: 'hidden' }]}
    />
  );
});

export { WebView };
export default WebView;
