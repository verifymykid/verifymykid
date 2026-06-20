import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../data/mockStore';

export default function GoogleMapView({ schoolIdFilter = null, centerCoords = null }) {
  const { guardians, activeAlerts, parents, schools } = useStore();
  const mapRef = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
  const markersRef = useRef({});
  const prevActiveIdsRef = useRef('');

  useEffect(() => {
    // If google maps is already loaded, skip loading script
    if (window.google && window.google.maps) {
      initMap();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyDTkVC3U_9h3Q9v6G-ljkxsn72nKjP1wvo&v=weekly`; 
    script.async = true;
    script.defer = true;
    script.onload = () => {
      initMap();
    };
    document.head.appendChild(script);

    return () => {
      // Clean up script if needed
    };
  }, []);

  const initMap = () => {
    if (!mapRef.current || !window.google) return;
    
    const school = schoolIdFilter ? schools.find(s => s.id === schoolIdFilter) : null;
    const schoolLat = school && school.lat;
    const schoolLng = school && school.lng;
    
    // Lagos center coordinates (falls back to school admin's login coordinates if available)
    const savedLat = parseFloat(localStorage.getItem('vmk_school_admin_lat'));
    const savedLng = parseFloat(localStorage.getItem('vmk_school_admin_lng'));
    const lagosCenter = (schoolLat && schoolLng)
      ? { lat: schoolLat, lng: schoolLng }
      : ((!isNaN(savedLat) && !isNaN(savedLng)) 
        ? { lat: savedLat, lng: savedLng } 
        : { lat: 6.5244, lng: 3.3792 });
    
    const map = new window.google.maps.Map(mapRef.current, {
      center: lagosCenter,
      zoom: 14,
      maxZoom: 15,
      disableDefaultUI: true,
      zoomControl: true,
      styles: [
        { "elementType": "geometry", "stylers": [{ "color": "#0b0f19" }] },
        { "elementType": "labels.text.fill", "stylers": [{ "color": "#8ec3b9" }] },
        { "elementType": "labels.text.stroke", "stylers": [{ "color": "#070a13" }] },
        { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#171d33" }] },
        { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#171d33" }] },
        { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#9ca3af" }] },
        { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#070a13" }] }
      ]
    });
    setMapInstance(map);

    // School Marker
    new window.google.maps.Marker({
      position: lagosCenter,
      map: map,
      title: school ? school.name : "School HQ",
      icon: {
        path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
        scale: 6,
        strokeColor: "#3b82f6",
        fillColor: "#3b82f6",
        fillOpacity: 0.8,
      }
    });
  };

  const getBusMarkerIcon = (hasPanic) => {
    if (!window.google) return null;
    const svgColor = hasPanic ? "#ef4444" : "#eab308"; // Yellow school bus color
    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="${svgColor}" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="4" y="3" width="16" height="13" rx="2" fill="${svgColor}"></rect>
        <path d="M4 11h16" stroke="#ffffff" stroke-width="1.5"></path>
        <circle cx="8" cy="18" r="2.5" fill="#ffffff" stroke="#333333" stroke-width="1"></circle>
        <circle cx="16" cy="18" r="2.5" fill="#ffffff" stroke="#333333" stroke-width="1"></circle>
        <rect x="7" y="5" width="3" height="3" fill="#ffffff" opacity="0.9"></rect>
        <rect x="14" y="5" width="3" height="3" fill="#ffffff" opacity="0.9"></rect>
        <path d="M6 14h12" stroke="#ffffff" stroke-width="1"></path>
      </svg>
    `;
    return {
      url: 'data:image/svg+xml;utf8,' + encodeURIComponent(svgContent),
      scaledSize: new window.google.maps.Size(40, 40),
      anchor: new window.google.maps.Point(20, 20)
    };
  };

  const getParentMarkerIcon = () => {
    if (!window.google) return null;
    const svgColor = "#3b82f6"; // Blue for parents
    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="${svgColor}" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="7" r="4" fill="${svgColor}"></circle>
        <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" fill="none" stroke="#ffffff" stroke-width="1.5"></path>
        <circle cx="12" cy="12" r="10" fill="none" stroke="${svgColor}" stroke-width="2"></circle>
      </svg>
    `;
    return {
      url: 'data:image/svg+xml;utf8,' + encodeURIComponent(svgContent),
      scaledSize: new window.google.maps.Size(40, 40),
      anchor: new window.google.maps.Point(20, 20)
    };
  };

  useEffect(() => {
    if (!mapInstance || !window.google) return;

    // Filter guardians by school and active tracking status
    const activeGuardians = schoolIdFilter 
      ? guardians.filter(g => g.schoolId === schoolIdFilter && g.online)
      : guardians.filter(g => g.online);

    // Filter parents by school and online status
    const activeParents = schoolIdFilter
      ? parents.filter(p => p.schoolId === schoolIdFilter && p.online && p.status !== 'DELETED')
      : parents.filter(p => p.online && p.status !== 'DELETED');

    // Update guardian markers
    activeGuardians.forEach(g => {
      const pos = { lat: g.lastLocation?.lat || 6.43, lng: g.lastLocation?.lng || 3.42 };
      const hasPanic = activeAlerts.some(a => a.guardianId === g.id && (schoolIdFilter ? !a.acknowledgedBySchoolAdmin : !a.acknowledgedBySuperAdmin));
      const key = `guardian-${g.id}`;

      if (markersRef.current[key]) {
        // Update position
        markersRef.current[key].setPosition(pos);
        // Update icon based on alert status
        markersRef.current[key].setIcon(getBusMarkerIcon(hasPanic));
      } else {
        // Create marker
        const marker = new window.google.maps.Marker({
          position: pos,
          map: mapInstance,
          title: `${g.busNumber} - Driver: ${g.driverName}`,
          icon: getBusMarkerIcon(hasPanic)
        });
        markersRef.current[key] = marker;
      }
    });

    // Update parent markers
    activeParents.forEach(p => {
      const pos = { lat: p.lat || 6.4312, lng: p.lng || 3.4190 };
      const key = `parent-${p.id}`;

      if (markersRef.current[key]) {
        markersRef.current[key].setPosition(pos);
        markersRef.current[key].setIcon(getParentMarkerIcon());
      } else {
        const marker = new window.google.maps.Marker({
          position: pos,
          map: mapInstance,
          title: `Parent: ${p.name}`,
          icon: getParentMarkerIcon()
        });
        markersRef.current[key] = marker;
      }
    });

    // Cleanup markers that are no longer active
    Object.keys(markersRef.current).forEach(key => {
      if (key.startsWith('parent-')) {
        const pId = key.substring(7);
        if (!activeParents.some(p => p.id === pId)) {
          markersRef.current[key].setMap(null);
          delete markersRef.current[key];
        }
      } else if (key.startsWith('guardian-')) {
        const gId = key.substring(9);
        if (!activeGuardians.some(g => g.id === gId)) {
          markersRef.current[key].setMap(null);
          delete markersRef.current[key];
        }
      } else {
        // Deprecated simple keys
        markersRef.current[key].setMap(null);
        delete markersRef.current[key];
      }
    });

    // Check if the set of active trackers actually changed
    const activeIds = [...activeGuardians.map(g => g.id), ...activeParents.map(p => p.id)].sort().join(',');
    const activeIdsChanged = prevActiveIdsRef.current !== activeIds;
    prevActiveIdsRef.current = activeIds;

    // Auto-focus and adjust map viewport dynamically
    const hasItems = activeGuardians.length > 0 || activeParents.length > 0;
    if (hasItems) {
      if (activeIdsChanged) {
        const bounds = new window.google.maps.LatLngBounds();
        activeGuardians.forEach(g => {
          bounds.extend({ lat: g.lastLocation?.lat || 6.43, lng: g.lastLocation?.lng || 3.42 });
        });
        activeParents.forEach(p => {
          bounds.extend({ lat: p.lat || 6.4312, lng: p.lng || 3.4190 });
        });
        mapInstance.fitBounds(bounds);
      }
    } else {
      if (activeIdsChanged) {
        const school = schoolIdFilter ? schools.find(s => s.id === schoolIdFilter) : null;
        const schoolLat = school && school.lat;
        const schoolLng = school && school.lng;
        
        const savedLat = parseFloat(localStorage.getItem('vmk_school_admin_lat'));
        const savedLng = parseFloat(localStorage.getItem('vmk_school_admin_lng'));
        const defaultCenter = (schoolLat && schoolLng)
          ? { lat: schoolLat, lng: schoolLng }
          : ((!isNaN(savedLat) && !isNaN(savedLng)) 
            ? { lat: savedLat, lng: savedLng } 
            : { lat: 6.5244, lng: 3.3792 });
        mapInstance.panTo(defaultCenter);
        mapInstance.setZoom(14);
      }
    }
  }, [mapInstance, guardians, activeAlerts, parents, schoolIdFilter, schools]);

  // Handle center fly-to centering coordinates
  useEffect(() => {
    if (centerCoords && mapInstance && window.google) {
      const pos = { lat: parseFloat(centerCoords.lat), lng: parseFloat(centerCoords.lng) };
      mapInstance.setCenter(pos);
      mapInstance.setZoom(16);
      
      const tempMarker = new window.google.maps.Marker({
        position: pos,
        map: mapInstance,
        title: "Telemetry Target",
        icon: {
          path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 6,
          strokeColor: "#ef4444",
          fillColor: "#ef4444",
          fillOpacity: 1.0,
        }
      });

      tempMarker.setAnimation(window.google.maps.Animation.BOUNCE);
      const timer = setTimeout(() => {
        tempMarker.setAnimation(null);
      }, 3000);

      return () => {
        clearTimeout(timer);
        tempMarker.setMap(null);
      };
    }
  }, [centerCoords, mapInstance]);

  return (
    <div style={{ position: 'relative' }}>
      <div ref={mapRef} style={{ width: '100%', height: '350px', borderRadius: '12px', border: '1px solid var(--glass-border)' }} />
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        background: 'rgba(7, 10, 19, 0.85)',
        border: '1px solid var(--glass-border)',
        borderRadius: '6px',
        padding: '0.4rem 0.6rem',
        fontSize: '0.65rem',
        color: 'var(--text-secondary)',
        zIndex: 5
      }}>
        📍 Lagos Telemetry Center • VI Grid
      </div>
    </div>
  );
}
