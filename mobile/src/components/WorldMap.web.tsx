// Web fallback: react-native-webview has no web implementation, so render the same page in an iframe.

import { useEffect, useMemo, useRef, useState } from 'react';
import { MAP_HTML, toMapPayload, type MapData } from './mapHtml';
import { colors } from '../theme';

interface Props extends MapData {
  onSelectEvent: (id: string) => void;
}

export function WorldMap({ events, hotspots, assets, onSelectEvent }: Props) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const payload = useMemo(() => toMapPayload({ events, hotspots, assets }), [events, hotspots, assets]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== ref.current?.contentWindow || typeof e.data !== 'string') return;
      const msg = JSON.parse(e.data);
      if (msg.type === 'ready') setReady(true);
      if (msg.type === 'event') onSelectEvent(msg.id);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onSelectEvent]);

  useEffect(() => {
    const win = ref.current?.contentWindow as (Window & { setMapData?: (d: unknown) => void }) | null;
    if (ready) win?.setMapData?.(JSON.parse(payload));
  }, [ready, payload]);

  return (
    <iframe
      ref={ref}
      srcDoc={MAP_HTML}
      title="World map"
      style={{ flex: 1, border: 0, width: '100%', height: '100%', background: colors.background }}
    />
  );
}
