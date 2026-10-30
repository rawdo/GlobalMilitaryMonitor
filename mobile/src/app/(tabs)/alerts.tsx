import { useMemo } from 'react';
import { EventList } from '../../components/EventList';
import { SEVERITY_RANK } from '../../lib/types';
import { useMonitor } from '../../state/MonitorProvider';

export default function AlertsScreen() {
  const { events } = useMonitor();
  // Critical first, then newest.
  const alerts = useMemo(
    () =>
      events
        .filter((e) => e.isAlert)
        .sort(
          (a, b) =>
            SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || b.timestamp.localeCompare(a.timestamp),
        ),
    [events],
  );
  return (
    <EventList
      events={alerts}
      emptyText="No high-severity alerts right now. Alerts appear for nuclear activity, missile launches, invasions and reported casualties."
    />
  );
}
