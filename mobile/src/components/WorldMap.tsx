import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { colors } from '../theme';
import { MAP_HTML, toMapPayload, type MapData } from './mapHtml';

// The package's class typings default their props generic to `undefined`, which collapses to `never`.
type MapWebView = WebView<object>;

interface Props extends MapData {
  onSelectEvent: (id: string) => void;
}

export function WorldMap({ events, hotspots, assets, onSelectEvent }: Props) {
  const ref = useRef<MapWebView>(null);
  const [ready, setReady] = useState(false);
  const payload = useMemo(() => toMapPayload({ events, hotspots, assets }), [events, hotspots, assets]);

  useEffect(() => {
    if (ready) ref.current?.injectJavaScript(`window.setMapData(${payload}); true;`);
  }, [ready, payload]);

  const onMessage = (e: WebViewMessageEvent) => {
    const msg = JSON.parse(e.nativeEvent.data);
    if (msg.type === 'ready') setReady(true);
    if (msg.type === 'event') onSelectEvent(msg.id);
  };

  return (
    <WebView<object>
      ref={ref}
      source={{ html: MAP_HTML, baseUrl: 'https://localhost' }}
      originWhitelist={['*']}
      onMessage={onMessage}
      style={styles.map}
      containerStyle={styles.map}
      javaScriptEnabled
      setSupportMultipleWindows={false}
    />
  );
}

const styles = StyleSheet.create({
  map: { flex: 1, backgroundColor: colors.background },
});
