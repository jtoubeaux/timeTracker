import { useState, useEffect } from 'react';
import { Clock, Users, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { useWebSocket } from '@/hooks/use-websocket';
import { useGeolocation } from '@/hooks/use-geolocation';
import { ClockInOutCard } from '@/components/clock-in-out-card';
import { LiveLocationMap } from '@/components/live-location-map';
import { QuickStats } from '@/components/quick-stats';
import { ActivityTimeline } from '@/components/activity-timeline';
import { TimesheetView } from '@/components/timesheet-view';
import { SpreadsheetIntegration } from '@/components/spreadsheet-integration';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Employee, TimeEntry, LocationBreadcrumb, LocationDeparture } from '@shared/schema';

export default function Dashboard() {
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [currentLocation, setCurrentLocation] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const { toast } = useToast();

  // Real-time clock update
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Get employees
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ['/api/employees'],
  });

  // Set first employee as current (in a real app, this would be based on authentication)
  useEffect(() => {
    if (employees.length > 0 && !currentEmployee) {
      setCurrentEmployee(employees[0]);
    }
  }, [employees, currentEmployee]);

  // Get active time entry
  const { data: activeTimeEntry } = useQuery<TimeEntry | null>({
    queryKey: ['/api/employees', currentEmployee?.id, 'active-time-entry'],
    enabled: !!currentEmployee,
  });

  // Get time entries
  const { data: timeEntries = [] } = useQuery<TimeEntry[]>({
    queryKey: ['/api/employees', currentEmployee?.id, 'time-entries'],
    enabled: !!currentEmployee,
  });

  // Get breadcrumbs for active session
  const { data: breadcrumbs = [] } = useQuery<LocationBreadcrumb[]>({
    queryKey: ['/api/time-entries', activeTimeEntry?.id, 'breadcrumbs'],
    enabled: !!activeTimeEntry,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Get location departures for active session
  const { data: departures = [] } = useQuery<LocationDeparture[]>({
    queryKey: ['/api/time-entries', activeTimeEntry?.id, 'departures'],
    enabled: !!activeTimeEntry,
    refetchInterval: 30000,
  });

  // Geolocation tracking
  const { latitude, longitude, accuracy, startWatching, stopWatching, isWatching } = useGeolocation({
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 30000,
  });

  // WebSocket for real-time updates
  useWebSocket({
    onMessage: (data) => {
      switch (data.type) {
        case 'LOCATION_UPDATE':
        case 'LOCATION_DEPARTURE':
          // Refetch relevant queries when location updates come in
          if (activeTimeEntry) {
            // Queries will automatically refetch based on their intervals
          }
          break;
        case 'CLOCK_IN':
        case 'CLOCK_OUT':
          // Show toast notification for other users' clock in/out events
          if (data.timeEntry?.employeeId !== currentEmployee?.id) {
            toast({
              title: `Employee ${data.type === 'CLOCK_IN' ? 'Clocked In' : 'Clocked Out'}`,
              description: 'Team member status updated',
            });
          }
          break;
      }
    },
  });

  // Mutation for sending location breadcrumbs
  const breadcrumbMutation = useMutation({
    mutationFn: async (locationData: { latitude: number; longitude: number; accuracy?: number; address?: string }) => {
      if (!activeTimeEntry) throw new Error('No active time entry');
      
      const response = await apiRequest('POST', `/api/time-entries/${activeTimeEntry.id}/breadcrumbs`, {
        latitude: locationData.latitude.toString(),
        longitude: locationData.longitude.toString(),
        accuracy: locationData.accuracy?.toString(),
        address: locationData.address,
      });
      return response.json();
    },
  });

  // Start/stop GPS tracking based on clock in/out status
  useEffect(() => {
    if (activeTimeEntry && !isWatching) {
      startWatching();
    } else if (!activeTimeEntry && isWatching) {
      stopWatching();
    }
  }, [activeTimeEntry, isWatching, startWatching, stopWatching]);

  // Send location breadcrumbs when location changes
  useEffect(() => {
    if (activeTimeEntry && latitude && longitude) {
      // Throttle breadcrumb updates to every 2 minutes
      const lastBreadcrumb = breadcrumbs[breadcrumbs.length - 1];
      const now = new Date();
      
      if (!lastBreadcrumb || 
          (now.getTime() - new Date(lastBreadcrumb.timestamp).getTime()) > 120000) {
        
        // Reverse geocode to get address (simplified - in production use a geocoding service)
        const address = currentLocation || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        
        breadcrumbMutation.mutate({
          latitude,
          longitude,
          accuracy: accuracy || undefined,
          address,
        });
      }
    }
  }, [latitude, longitude, activeTimeEntry, breadcrumbs, accuracy, currentLocation]);

  // Reverse geocoding effect (simplified)
  useEffect(() => {
    if (latitude && longitude) {
      // In a real app, use a geocoding service like Google Maps Geocoding API
      setCurrentLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
    }
  }, [latitude, longitude]);

  // Emergency clock out
  const emergencyClockOut = () => {
    if (activeTimeEntry) {
      // This would trigger the clock out mutation from ClockInOutCard
      toast({
        title: 'Emergency Clock Out',
        description: 'Please use the main clock out button to complete your session.',
        variant: 'destructive',
      });
    }
  };

  // Get today's breadcrumbs for stats
  const getTodayBreadcrumbs = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return breadcrumbs.filter(bc => {
      const bcDate = new Date(bc.timestamp);
      bcDate.setHours(0, 0, 0, 0);
      return bcDate.getTime() === today.getTime();
    });
  };

  const todayBreadcrumbs = getTodayBreadcrumbs();

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-lg">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Clock className="h-6 w-6" />
              <h1 className="text-xl font-roboto-condensed font-bold">TimeKeeper Pro</h1>
            </div>

            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-2">
                {activeTimeEntry ? (
                  <>
                    <div className="w-2 h-2 bg-secondary rounded-full animate-pulse"></div>
                    <span className="text-sm">{currentEmployee?.name || 'Unknown'}</span>
                    <Badge variant="secondary" className="text-xs">
                      Clocked In
                    </Badge>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-muted rounded-full"></div>
                    <span className="text-sm">{currentEmployee?.name || 'Unknown'}</span>
                    <Badge variant="outline" className="text-xs">
                      Clocked Out
                    </Badge>
                  </>
                )}
              </div>
              <Button variant="ghost" size="sm" className="md:hidden">
                <Users className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Clock In/Out Card */}
        <ClockInOutCard
          currentEmployee={currentEmployee}
          activeTimeEntry={activeTimeEntry || null}
          currentLocation={currentLocation}
        />

        {/* Quick Stats */}
        <QuickStats
          timeEntries={timeEntries}
          todayBreadcrumbs={todayBreadcrumbs}
          activeTimeEntry={activeTimeEntry || null}
        />

        {/* Live Location Map */}
        <LiveLocationMap
          breadcrumbs={breadcrumbs}
          isTracking={!!activeTimeEntry && isWatching}
        />

        {/* Activity Timeline */}
        <ActivityTimeline
          timeEntries={timeEntries}
          departures={departures}
        />

        {/* Spreadsheet Integration */}
        <SpreadsheetIntegration />

        {/* Weekly Timesheet */}
        <TimesheetView
          timeEntries={timeEntries}
          activeTimeEntry={activeTimeEntry || null}
        />
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6">
        <Button
          onClick={emergencyClockOut}
          size="lg"
          className="w-14 h-14 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-full shadow-lg transition-colors duration-200"
          title="Emergency Clock Out"
        >
          <AlertTriangle className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}
