import { useState } from 'react';
import { Clock, MapPin, LogIn, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useGeolocation } from '@/hooks/use-geolocation';
import type { TimeEntry } from '@shared/schema';

interface ClockInOutCardProps {
  currentEmployee: { id: string; name: string } | null;
  activeTimeEntry: TimeEntry | null;
  currentLocation: string;
}

export function ClockInOutCard({ currentEmployee, activeTimeEntry, currentLocation }: ClockInOutCardProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { latitude, longitude, getCurrentPosition } = useGeolocation();

  // Update clock every second
  useState(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  });

  const clockInMutation = useMutation({
    mutationFn: async () => {
      if (!currentEmployee) throw new Error('No employee selected');
      
      let locationData = undefined;
      try {
        const position = await getCurrentPosition();
        locationData = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          address: currentLocation || 'Unknown location',
        };
      } catch (error) {
        console.warn('Failed to get location for clock in:', error);
      }

      const response = await apiRequest('POST', '/api/time-entries/clock-in', {
        employeeId: currentEmployee.id,
        clockInLocation: locationData,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees', currentEmployee?.id, 'active-time-entry'] });
      queryClient.invalidateQueries({ queryKey: ['/api/employees', currentEmployee?.id, 'time-entries'] });
      toast({
        title: 'Clocked In Successfully',
        description: 'GPS tracking has started for your work session.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Clock In Failed',
        description: error.message || 'Failed to clock in. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: async () => {
      if (!activeTimeEntry) throw new Error('No active time entry');
      
      let locationData = undefined;
      try {
        const position = await getCurrentPosition();
        locationData = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          address: currentLocation || 'Unknown location',
        };
      } catch (error) {
        console.warn('Failed to get location for clock out:', error);
      }

      const response = await apiRequest('POST', `/api/time-entries/${activeTimeEntry.id}/clock-out`, {
        clockOutLocation: locationData,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees', currentEmployee?.id, 'active-time-entry'] });
      queryClient.invalidateQueries({ queryKey: ['/api/employees', currentEmployee?.id, 'time-entries'] });
      toast({
        title: 'Clocked Out Successfully',
        description: 'GPS tracking has stopped. Your time has been recorded.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Clock Out Failed',
        description: error.message || 'Failed to clock out. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getTimeSince = (clockInTime: string) => {
    const start = new Date(clockInTime);
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <Card className="card-elevated">
      <CardContent className="p-6">
        <div className="text-center">
          <div className="mb-4">
            <div className="text-4xl font-roboto-condensed font-bold text-gray-800 dark:text-gray-200">
              {formatTime(currentTime)}
            </div>
            <div className="text-sm text-muted-foreground">
              {formatDate(currentTime)}
            </div>
          </div>

          <div className="mb-6">
            {activeTimeEntry ? (
              <Badge variant="default" className="bg-secondary text-secondary-foreground px-4 py-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse mr-2"></div>
                Clocked In since {formatTime(new Date(activeTimeEntry.clockInTime))}
                <span className="ml-2 text-xs opacity-90">
                  ({getTimeSince(activeTimeEntry.clockInTime)})
                </span>
              </Badge>
            ) : (
              <Badge variant="outline" className="px-4 py-2">
                <Clock className="w-4 h-4 mr-2" />
                Not Clocked In
              </Badge>
            )}
          </div>

          <div className="space-y-4">
            {activeTimeEntry ? (
              <Button
                onClick={() => clockOutMutation.mutate()}
                disabled={clockOutMutation.isPending || !currentEmployee}
                className="ripple w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground font-medium py-4 px-6 transition-colors duration-200"
                size="lg"
              >
                <LogOut className="mr-2 h-5 w-5" />
                {clockOutMutation.isPending ? 'Clocking Out...' : 'Clock Out'}
              </Button>
            ) : (
              <Button
                onClick={() => clockInMutation.mutate()}
                disabled={clockInMutation.isPending || !currentEmployee}
                className="ripple w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-4 px-6 transition-colors duration-200"
                size="lg"
              >
                <LogIn className="mr-2 h-5 w-5" />
                {clockInMutation.isPending ? 'Clocking In...' : 'Clock In'}
              </Button>
            )}

            {latitude && longitude && (
              <div className="text-sm text-muted-foreground flex items-center justify-center">
                <MapPin className="mr-1 h-4 w-4 text-primary" />
                <span>{currentLocation || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
