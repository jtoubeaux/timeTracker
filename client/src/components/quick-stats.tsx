import { Clock, MapPin, Route } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { TimeEntry, LocationBreadcrumb } from '@shared/schema';

interface QuickStatsProps {
  timeEntries: TimeEntry[];
  todayBreadcrumbs: LocationBreadcrumb[];
  activeTimeEntry: TimeEntry | null;
}

export function QuickStats({ timeEntries, todayBreadcrumbs, activeTimeEntry }: QuickStatsProps) {
  const calculateTodayHours = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let totalMinutes = 0;
    
    // Add completed entries from today
    timeEntries
      .filter(entry => {
        const entryDate = new Date(entry.clockInTime);
        entryDate.setHours(0, 0, 0, 0);
        return entryDate.getTime() === today.getTime() && entry.totalHours;
      })
      .forEach(entry => {
        totalMinutes += parseFloat(entry.totalHours || '0') * 60;
      });
    
    // Add current active session
    if (activeTimeEntry) {
      const clockInTime = new Date(activeTimeEntry.clockInTime);
      const now = new Date();
      if (clockInTime >= today) {
        const sessionMinutes = (now.getTime() - clockInTime.getTime()) / (1000 * 60);
        totalMinutes += sessionMinutes;
      }
    }
    
    return (totalMinutes / 60).toFixed(1);
  };

  const calculateLocationsVisited = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayEntries = timeEntries.filter(entry => {
      const entryDate = new Date(entry.clockInTime);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate.getTime() === today.getTime();
    });
    
    // Count unique locations (simplified - could be enhanced with actual location clustering)
    const uniqueAddresses = new Set();
    todayEntries.forEach(entry => {
      if (entry.clockInLocation?.address) {
        uniqueAddresses.add(entry.clockInLocation.address);
      }
      if (entry.clockOutLocation?.address) {
        uniqueAddresses.add(entry.clockOutLocation.address);
      }
    });
    
    // Add breadcrumb locations
    todayBreadcrumbs.forEach(bc => {
      if (bc.address) {
        uniqueAddresses.add(bc.address);
      }
    });
    
    return uniqueAddresses.size;
  };

  const calculateDistanceTraveled = () => {
    if (todayBreadcrumbs.length < 2) return '0.0';
    
    let totalDistance = 0;
    
    for (let i = 1; i < todayBreadcrumbs.length; i++) {
      const prev = todayBreadcrumbs[i - 1];
      const curr = todayBreadcrumbs[i];
      
      const lat1 = parseFloat(prev.latitude);
      const lng1 = parseFloat(prev.longitude);
      const lat2 = parseFloat(curr.latitude);
      const lng2 = parseFloat(curr.longitude);
      
      // Haversine formula for distance calculation
      const R = 6371; // Earth's radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;
      
      totalDistance += distance;
    }
    
    // Convert to miles and format
    return (totalDistance * 0.621371).toFixed(1);
  };

  const todayHours = calculateTodayHours();
  const locationsVisited = calculateLocationsVisited();
  const distanceTraveled = calculateDistanceTraveled();

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <Card className="card-elevated">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-primary">{todayHours}</div>
              <div className="text-sm text-muted-foreground">Hours Today</div>
            </div>
            <Clock className="h-5 w-5 text-primary" />
          </div>
        </CardContent>
      </Card>

      <Card className="card-elevated">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-secondary">{locationsVisited}</div>
              <div className="text-sm text-muted-foreground">Locations Today</div>
            </div>
            <MapPin className="h-5 w-5 text-secondary" />
          </div>
        </CardContent>
      </Card>

      <Card className="card-elevated">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-warning">{distanceTraveled}</div>
              <div className="text-sm text-muted-foreground">Miles Traveled</div>
            </div>
            <Route className="h-5 w-5 text-warning" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
