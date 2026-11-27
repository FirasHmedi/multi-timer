import { FlexWidget, TextWidget } from 'react-native-android-widget';

import { formatClock, t } from '../i18n';
import type { WidgetData } from '../lib/widget';
import { darkPalette, lightPalette, type Palette } from '../theme';

export const WIDGET_NAME = 'Timers';

type Hex = `#${string}`;

function Body({ data, c }: { data: WidgetData; c: Palette }) {
  const color = (v: string) => v as Hex;
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      accessibilityLabel={t('appName')}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        backgroundColor: color(c.bg),
        borderRadius: 20,
        padding: 14,
        flexGap: 6,
      }}
    >
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center' }}>
        <FlexWidget style={{ flex: 1 }}>
          <TextWidget
            text={t('widgetTitle')}
            maxLines={1}
            truncate="END"
            style={{ fontSize: 14, fontWeight: '600', color: color(c.muted) }}
          />
        </FlexWidget>
        <FlexWidget
          clickAction="OPEN_APP"
          accessibilityLabel={t('widgetOpen')}
          style={{ backgroundColor: color(c.accent), borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 }}
        >
          <TextWidget text={t('widgetOpen')} style={{ fontSize: 14, fontWeight: '600', color: color(c.accentText) }} />
        </FlexWidget>
      </FlexWidget>
      {data.rows.length === 0 ? (
        <TextWidget text={t('widgetEmpty')} style={{ fontSize: 16, color: color(c.text) }} />
      ) : (
        data.rows.map((r) => (
          <FlexWidget key={r.id} style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center' }}>
            <FlexWidget style={{ flex: 1 }}>
              <TextWidget
                text={r.label}
                maxLines={1}
                truncate="END"
                style={{ fontSize: 16, fontWeight: '600', color: color(c.text) }}
              />
            </FlexWidget>
            <TextWidget
              text={` — ${t('widgetEndsAt', { time: formatClock(r.endAt) })}`}
              maxLines={1}
              style={{ fontSize: 16, color: color(c.muted) }}
            />
          </FlexWidget>
        ))
      )}
      {data.more > 0 ? (
        <TextWidget text={t('widgetMore', { n: String(data.more) })} style={{ fontSize: 14, color: color(c.muted) }} />
      ) : null}
    </FlexWidget>
  );
}

/** Light and dark versions: the launcher picks the one matching the phone theme. */
export function TimersWidget({ data }: { data: WidgetData }) {
  return { light: <Body data={data} c={lightPalette} />, dark: <Body data={data} c={darkPalette} /> };
}
