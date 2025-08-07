import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { TimeEntry } from '@shared/schema';

interface TimesheetViewProps {
  timeEntries: TimeEntry[];
  activeTimeEntry: TimeEntry | null;
}

export function TimesheetView({ timeEntries, activeTimeEntry }: TimesheetViewProps) {
  const getWeeklyEntries = () => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Start of current week (Sunday)
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    return timeEntries.filter(entry => {
      const entryDate = new Date(entry.clockInTime);
      return entryDate >= startOfWeek && entryDate <= endOfWeek;
    });
  };

  const groupEntriesByDate = (entries: TimeEntry[]) => {
    const grouped: { [key: string]: TimeEntry[] } = {};
    
    entries.forEach(entry => {
      const date = new Date(entry.clockInTime);
      const dateKey = date.toDateString();
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(entry);
    });
    
    return grouped;
  };

  const calculateDayTotal = (entries: TimeEntry[], date: string, activeEntry?: TimeEntry | null) => {
    let totalMinutes = 0;
    
    entries.forEach(entry => {
      if (entry.totalHours) {
        totalMinutes += parseFloat(entry.totalHours) * 60;
      }
    });
    
    // Add current active session if it's for today
    if (activeEntry && !activeEntry.clockOutTime) {
      const entryDate = new Date(activeEntry.clockInTime).toDateString();
      const checkDate = new Date(date).toDateString();
      
      if (entryDate === checkDate) {
        const clockInTime = new Date(activeEntry.clockInTime);
        const now = new Date();
        const sessionMinutes = (now.getTime() - clockInTime.getTime()) / (1000 * 60);
        totalMinutes += sessionMinutes;
      }
    }
    
    return (totalMinutes / 60).toFixed(1);
  };

  const countLocations = (entries: TimeEntry[]) => {
    const locations = new Set<string>();
    
    entries.forEach(entry => {
      if (entry.clockInLocation?.address) {
        locations.add(entry.clockInLocation.address);
      }
      if (entry.clockOutLocation?.address) {
        locations.add(entry.clockOutLocation.address);
      }
    });
    
    return locations.size;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const calculateWeekTotal = () => {
    const weeklyEntries = getWeeklyEntries();
    const grouped = groupEntriesByDate(weeklyEntries);
    
    let totalHours = 0;
    Object.keys(grouped).forEach(date => {
      totalHours += parseFloat(calculateDayTotal(grouped[date], date, activeTimeEntry));
    });
    
    return totalHours.toFixed(1);
  };

  const weeklyEntries = getWeeklyEntries();
  const groupedEntries = groupEntriesByDate(weeklyEntries);
  const weekTotal = calculateWeekTotal();

  // Create array of all days in the week to show empty days too
  const weekDays = [];
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  
  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    weekDays.push(day.toDateString());
  }

  return (
    <Card className="card-elevated">
      <CardHeader>
        <CardTitle className="text-lg font-medium">This Week's Timesheet</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr>
                <th className="text-left py-3 font-medium text-foreground">Date</th>
                <th className="text-left py-3 font-medium text-foreground">Clock In</th>
                <th className="text-left py-3 font-medium text-foreground">Clock Out</th>
                <th className="text-left py-3 font-medium text-foreground">Total Hours</th>
                <th className="text-left py-3 font-medium text-foreground">Locations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {weekDays.map(date => {
                const dayEntries = groupedEntries[date] || [];
                const firstEntry = dayEntries[0];
                const lastEntry = dayEntries[dayEntries.length - 1];
                const dayTotal = calculateDayTotal(dayEntries, date, activeTimeEntry);
                const locationCount = countLocations(dayEntries);
                const hasActiveSession = activeTimeEntry && 
                  new Date(activeTimeEntry.clockInTime).toDateString() === date && 
                  !activeTimeEntry.clockOutTime;

                return (
                  <tr key={date} className={dayEntries.length === 0 ? 'opacity-50' : ''}>
                    <td className="py-3">{formatDate(date)}</td>
                    <td className="py-3">
                      {firstEntry ? formatTime(firstEntry.clockInTime.toString()) : '-'}
                    </td>
                    <td className="py-3">
                      {hasActiveSession ? (
                        <Badge variant="secondary" className="text-xs">
                          In Progress
                        </Badge>
                      ) : lastEntry?.clockOutTime ? (
                        formatTime(lastEntry.clockOutTime.toString())
                      ) : firstEntry ? (
                        <Badge variant="outline" className="text-xs">
                          No Clock Out
                        </Badge>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-3 font-medium">
                      {dayEntries.length > 0 || hasActiveSession ? `${dayTotal} hrs` : '-'}
                    </td>
                    <td className="py-3">
                      {locationCount > 0 ? locationCount : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-foreground">Week Total:</span>
            <span className="text-lg font-bold text-primary">{weekTotal} hours</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
