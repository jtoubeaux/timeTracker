import { Clock, MapPin, Route, LogIn, LogOut } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TimeEntry, LocationDeparture } from '@shared/schema';

interface ActivityTimelineProps {
  timeEntries: TimeEntry[];
  departures: LocationDeparture[];
}

interface TimelineEvent {
  id: string;
  time: Date;
  type: 'clock_in' | 'clock_out' | 'location_change';
  location: string;
  duration?: string;
  details?: string;
}

export function ActivityTimeline({ timeEntries, departures }: ActivityTimelineProps) {
  const generateTimelineEvents = (): TimelineEvent[] => {
    const events: TimelineEvent[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Add today's time entries
    const todayEntries = timeEntries.filter(entry => {
      const entryDate = new Date(entry.clockInTime);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate.getTime() === today.getTime();
    });
    
    todayEntries.forEach(entry => {
      // Clock in event
      events.push({
        id: `${entry.id}-in`,
        time: new Date(entry.clockInTime),
        type: 'clock_in',
        location: entry.clockInLocation?.address || 'Unknown location',
        details: 'Started work session'
      });
      
      // Clock out event (if completed)
      if (entry.clockOutTime) {
        events.push({
          id: `${entry.id}-out`,
          time: new Date(entry.clockOutTime),
          type: 'clock_out',
          location: entry.clockOutLocation?.address || 'Unknown location',
          duration: entry.totalHours ? `${entry.totalHours} hrs` : undefined,
          details: 'Ended work session'
        });
      }
    });
    
    // Add location departures for today
    const todayDepartures = departures.filter(departure => {
      const departureDate = new Date(departure.timestamp);
      departureDate.setHours(0, 0, 0, 0);
      return departureDate.getTime() === today.getTime();
    });
    
    todayDepartures.forEach(departure => {
      const distanceKm = parseFloat(departure.distance || '0') / 1000;
      const distanceMiles = (distanceKm * 0.621371).toFixed(1);
      
      events.push({
        id: departure.id,
        time: new Date(departure.timestamp),
        type: 'location_change',
        location: departure.toLocation.address,
        details: `Moved from ${departure.fromLocation.address}`,
        duration: `${distanceMiles} mi`
      });
    });
    
    // Sort events by time
    return events.sort((a, b) => a.time.getTime() - b.time.getTime());
  };

  const events = generateTimelineEvents();

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'clock_in':
        return <LogIn className="text-white text-sm" />;
      case 'clock_out':
        return <LogOut className="text-white text-sm" />;
      case 'location_change':
        return <Route className="text-white text-sm" />;
      default:
        return <Clock className="text-white text-sm" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'clock_in':
        return 'bg-secondary';
      case 'clock_out':
        return 'bg-destructive';
      case 'location_change':
        return 'bg-warning';
      default:
        return 'bg-primary';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatEventType = (type: string) => {
    switch (type) {
      case 'clock_in':
        return 'Clocked In';
      case 'clock_out':
        return 'Clocked Out';
      case 'location_change':
        return 'Location Changed';
      default:
        return 'Event';
    }
  };

  if (events.length === 0) {
    return (
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="text-lg font-medium">Today's Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No activity recorded for today.</p>
            <p className="text-sm">Clock in to start tracking your work session.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-elevated">
      <CardHeader>
        <CardTitle className="text-lg font-medium">Today's Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {events.map((event, index) => (
            <div key={event.id} className="flex items-start space-x-4">
              <div className={`flex-shrink-0 w-10 h-10 ${getEventColor(event.type)} rounded-full flex items-center justify-center`}>
                {getEventIcon(event.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-medium">{formatTime(event.time)}</div>
                  {event.duration && (
                    <div className="text-xs text-muted-foreground">{event.duration}</div>
                  )}
                </div>
                <div className="text-sm text-foreground">{formatEventType(event.type)}</div>
                {event.details && (
                  <div className="text-xs text-muted-foreground mt-1">{event.details}</div>
                )}
                <div className="text-xs text-muted-foreground flex items-center mt-1">
                  <MapPin className="h-3 w-3 mr-1" />
                  {event.location}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
