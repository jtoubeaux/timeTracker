import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, Clock, Target } from 'lucide-react';
import { useGeolocation } from '@/hooks/use-geolocation';
import type { LocationBreadcrumb } from '@shared/schema';

interface LiveLocationTrackingProps {
  breadcrumbs: LocationBreadcrumb[];
  isTracking: boolean;
}

export function LiveLocationMap({ breadcrumbs, isTracking }: LiveLocationTrackingProps) {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  const { latitude, longitude, accuracy, error } = useGeolocation({
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 0,
  });

  useEffect(() => {
    if (latitude && longitude) {
      setLastUpdate(new Date());
    }
  }, [latitude, longitude]);

  const formatCoordinate = (coord: number) => {
    return coord.toFixed(6);
  };

  const getLocationSummary = () => {
    if (!latitude || !longitude) return "Waiting for location...";
    
    const totalDistance = breadcrumbs.length > 0 ? 
      `${breadcrumbs.length} tracking points` : 
      "No movement recorded";
      
    return totalDistance;
  };

  return (
    <Card className="card-elevated overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">GPS Location Tracking</CardTitle>
          <div className="flex items-center space-x-2">
            {isTracking && !error ? (
              <>
                <div className="w-2 h-2 bg-secondary rounded-full animate-pulse"></div>
                <span className="text-sm text-muted-foreground">GPS Active</span>
              </>
            ) : error ? (
              <>
                <div className="w-2 h-2 bg-destructive rounded-full"></div>
                <span className="text-sm text-destructive">GPS Error</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-muted rounded-full"></div>
                <span className="text-sm text-muted-foreground">GPS Inactive</span>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {/* Location Status */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-primary" />
            <div>
              <div className="text-xs text-muted-foreground">Status</div>
              <div className="text-sm font-medium">
                {isTracking ? "Tracking" : "Stopped"}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Target className="h-4 w-4 text-secondary" />
            <div>
              <div className="text-xs text-muted-foreground">Accuracy</div>
              <div className="text-sm font-medium">
                {accuracy ? `±${Math.round(accuracy)}m` : "Unknown"}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Navigation className="h-4 w-4 text-chart-3" />
            <div>
              <div className="text-xs text-muted-foreground">Points</div>
              <div className="text-sm font-medium">
                {breadcrumbs.length}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-chart-4" />
            <div>
              <div className="text-xs text-muted-foreground">Last Update</div>
              <div className="text-sm font-medium">
                {lastUpdate.toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>

        {/* Current Location */}
        <div className="bg-muted/50 dark:bg-muted/20 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">Current Location</h3>
            {breadcrumbs.length > 0 && (
              <Badge variant="secondary">
                {breadcrumbs.length} waypoints tracked
              </Badge>
            )}
          </div>
          
          {latitude && longitude ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Coordinates</div>
                <div className="font-mono text-sm">
                  {formatCoordinate(latitude)}, {formatCoordinate(longitude)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Tracking Summary</div>
                <div className="text-sm">
                  {getLocationSummary()}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <div className="text-center">
                <MapPin className="h-8 w-8 mx-auto mb-2" />
                <div className="text-sm">
                  {error || "Waiting for GPS location..."}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        {breadcrumbs.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium mb-3">Recent Activity</h3>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {breadcrumbs.slice(-5).reverse().map((breadcrumb, index) => (
                <div key={breadcrumb.id} className="flex items-center justify-between text-xs border-l-2 border-primary pl-3 py-1">
                  <div>
                    <span className="font-medium">
                      {new Date(breadcrumb.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="text-muted-foreground ml-2">
                      {breadcrumb.address || `${parseFloat(breadcrumb.latitude).toFixed(4)}, ${parseFloat(breadcrumb.longitude).toFixed(4)}`}
                    </span>
                  </div>
                  <div className="text-muted-foreground">
                    {breadcrumb.accuracy && `±${Math.round(parseFloat(breadcrumb.accuracy))}m`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
