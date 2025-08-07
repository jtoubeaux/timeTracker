import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Wifi } from 'lucide-react';
import { useGeolocation } from '@/hooks/use-geolocation';
import type { LocationBreadcrumb } from '@shared/schema';

// Leaflet imports (loaded from CDN)
declare global {
  interface Window {
    L: any;
  }
}

interface LiveLocationMapProps {
  breadcrumbs: LocationBreadcrumb[];
  isTracking: boolean;
}

export function LiveLocationMap({ breadcrumbs, isTracking }: LiveLocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  const { latitude, longitude, accuracy, error } = useGeolocation({
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 30000,
  });

  // Load Leaflet script if not already loaded
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.L) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      document.head.appendChild(script);
      
      script.onload = () => {
        initializeMap();
      };
    } else if (window.L) {
      initializeMap();
    }
  }, []);

  const initializeMap = () => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map
    const map = window.L.map(mapRef.current).setView([40.7128, -74.0060], 13);

    // Add tile layer
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    mapInstanceRef.current = map;
  };

  // Update map with current location and breadcrumbs
  useEffect(() => {
    if (!mapInstanceRef.current || !latitude || !longitude) return;

    const map = mapInstanceRef.current;

    // Clear existing markers and polylines
    markersRef.current.forEach(marker => map.removeLayer(marker));
    markersRef.current = [];
    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
    }

    // Add current location marker
    const currentLocationIcon = window.L.divIcon({
      className: 'current-location-marker',
      html: '<div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    const currentMarker = window.L.marker([latitude, longitude], {
      icon: currentLocationIcon
    }).addTo(map);
    markersRef.current.push(currentMarker);

    // Add accuracy circle
    if (accuracy) {
      const accuracyCircle = window.L.circle([latitude, longitude], {
        radius: accuracy,
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.1,
        weight: 1,
      }).addTo(map);
      markersRef.current.push(accuracyCircle);
    }

    // Add breadcrumb trail
    if (breadcrumbs.length > 0) {
      const breadcrumbPoints = breadcrumbs.map(bc => [
        parseFloat(bc.latitude),
        parseFloat(bc.longitude)
      ]);

      // Add breadcrumb markers
      breadcrumbs.forEach((breadcrumb, index) => {
        const isFirst = index === 0;
        const isLast = index === breadcrumbs.length - 1;
        
        const breadcrumbIcon = window.L.divIcon({
          className: 'breadcrumb-marker',
          html: `<div class="w-3 h-3 ${isFirst ? 'bg-green-500' : isLast ? 'bg-red-500' : 'bg-orange-500'} rounded-full border border-white shadow"></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        });

        const marker = window.L.marker([parseFloat(breadcrumb.latitude), parseFloat(breadcrumb.longitude)], {
          icon: breadcrumbIcon
        }).addTo(map);

        marker.bindPopup(`
          <div class="text-xs">
            <strong>${isFirst ? 'Start' : isLast ? 'Current' : 'Waypoint'}</strong><br>
            Time: ${new Date(breadcrumb.timestamp).toLocaleTimeString()}<br>
            ${breadcrumb.address || 'Unknown location'}
          </div>
        `);

        markersRef.current.push(marker);
      });

      // Add current location to the trail
      const allPoints = [...breadcrumbPoints, [latitude, longitude]];
      
      // Create polyline for the trail
      polylineRef.current = window.L.polyline(allPoints, {
        color: '#3b82f6',
        weight: 3,
        opacity: 0.7,
      }).addTo(map);

      // Fit map to show all points
      const group = new window.L.featureGroup([polylineRef.current, currentMarker]);
      map.fitBounds(group.getBounds().pad(0.1));
    } else {
      // Center on current location if no breadcrumbs
      map.setView([latitude, longitude], 15);
    }

    setLastUpdate(new Date());
  }, [latitude, longitude, accuracy, breadcrumbs]);

  return (
    <Card className="card-elevated overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">Live Location Tracking</CardTitle>
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

      <CardContent className="p-0">
        <div className="h-64 bg-muted relative">
          {/* Map container */}
          <div ref={mapRef} className="h-full w-full" />
          
          {/* Map not loaded fallback */}
          {!window?.L && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <div className="text-center text-muted-foreground">
                <MapPin className="h-8 w-8 mx-auto mb-2" />
                <div className="text-sm">Loading map...</div>
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="absolute top-4 left-4 right-4">
              <Badge variant="destructive" className="w-full justify-center">
                <Wifi className="mr-2 h-4 w-4" />
                {error}
              </Badge>
            </div>
          )}

          {/* Breadcrumb count indicator */}
          {breadcrumbs.length > 0 && (
            <div className="absolute top-4 right-4">
              <Badge variant="secondary">
                {breadcrumbs.length} waypoints
              </Badge>
            </div>
          )}
        </div>

        <div className="p-4 bg-muted/50 dark:bg-muted/20 border-t">
          <div className="text-sm text-muted-foreground">
            Last updated: {lastUpdate.toLocaleTimeString()} | 
            {accuracy ? ` Accuracy: ±${Math.round(accuracy)} meters` : ' Accuracy: Unknown'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
