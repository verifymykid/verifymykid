import React, { useState } from 'react';
import { Bus, MapPin, Navigation, School, AlertTriangle, User } from 'lucide-react';
import { useStore } from '../data/mockStore';

export default function MapView({ schoolIdFilter = null }) {
  const { guardians, activeAlerts, schools } = useStore();
  const [selectedBus, setSelectedBus] = useState(null);

  // Map Coordinate projection
  // Lat: 42.34 to 42.37
  // Lng: -71.13 to -71.08
  const projectCoords = (lat, lng) => {
    const latMin = 42.338;
    const latMax = 42.372;
    const lngMin = -71.135;
    const lngMax = -71.075;

    const width = 600;
    const height = 320;

    const x = ((lng - lngMin) / (lngMax - lngMin)) * width;
    const y = height - ((lat - latMin) / (latMax - latMin)) * height;

    return { 
      x: Math.max(15, Math.min(width - 15, x)), 
      y: Math.max(15, Math.min(height - 15, y)) 
    };
  };

  // Filter guardians by school if specified
  const activeGuardians = schoolIdFilter 
    ? guardians.filter(g => g.schoolId === schoolIdFilter)
    : guardians;

  // Greenwood school coordinate
  const schoolCoords = projectCoords(42.352, -71.105);

  return (
    <div style={{ position: 'relative' }}>
      <div className="map-container">
        <svg className="map-svg" viewBox="0 0 600 320">
          {/* Map Grid Roads (Dynamic SVG Paths) */}
          <path d="M 50,20 L 550,20 M 50,120 L 550,120 M 50,220 L 550,220 M 50,300 L 550,300" className="map-road" />
          <path d="M 80,10 L 80,310 M 250,10 L 250,310 M 420,10 L 420,310 M 520,10 L 520,310" className="map-road" />
          
          {/* Active stylized transit routes */}
          <path d="M 80,120 Q 250,80 420,120 T 520,220" className="map-road-active" strokeDasharray="5,5" />
          <path d="M 250,220 L 250,120 L 420,120" className="map-road-active" strokeDasharray="4,4" style={{ stroke: 'var(--accent-green)' }} />

          {/* School Node */}
          <g transform={`translate(${schoolCoords.x}, ${schoolCoords.y})`} style={{ cursor: 'pointer' }}>
            <circle r="14" fill="var(--bg-secondary)" stroke="var(--accent-blue)" strokeWidth="2" />
            <circle r="10" fill="rgba(59, 130, 246, 0.2)" />
            <foreignObject x="-7" y="-7" width="14" height="14">
              <School size={14} style={{ color: 'var(--accent-blue)' }} />
            </foreignObject>
            <text y="-18" fontSize="10" fill="var(--text-primary)" fontWeight="bold" textAnchor="middle">
              Greenwood HQ
            </text>
          </g>

          {/* Static Parent House Pins */}
          {[
            { lat: 42.342, lng: -71.125, name: 'Jenkins Home' },
            { lat: 42.365, lng: -71.085, name: 'Carter Home' },
            { lat: 42.358, lng: -71.128, name: 'Stafford Home' }
          ].map((h, i) => {
            const pt = projectCoords(h.lat, h.lng);
            return (
              <g key={i} transform={`translate(${pt.x}, ${pt.y})`}>
                <circle r="12" fill="var(--bg-secondary)" stroke="var(--accent-blue)" strokeWidth="1.5" />
                <circle r="8" fill="rgba(59, 130, 246, 0.15)" />
                <foreignObject x="-6" y="-6" width="12" height="12">
                  <User size={12} style={{ color: 'var(--accent-blue)' }} />
                </foreignObject>
                <text y="-14" fontSize="8" fill="var(--text-secondary)" textAnchor="middle">
                  {h.name}
                </text>
              </g>
            );
          })}

          {/* Dynamic Bus Guardians Map Markers */}
          {activeGuardians.map(g => {
            const pt = projectCoords(g.lastLocation?.lat || 42.35, g.lastLocation?.lng || -71.1);
            const hasPanic = activeAlerts.some(a => a.guardianId === g.id && (schoolIdFilter ? !a.acknowledgedBySchoolAdmin : !a.acknowledgedBySuperAdmin));
            
            return (
              <g 
                key={g.id} 
                transform={`translate(${pt.x}, ${pt.y})`}
                onClick={() => setSelectedBus(g)}
                className="map-bus-icon"
              >
                {/* Red pulsing emergency indicator */}
                {hasPanic ? (
                  <>
                    <circle r="20" fill="none" stroke="var(--accent-red)" strokeWidth="2" className="pulse-emergency" style={{ animation: 'pulse-red 1s infinite' }} />
                    <circle r="10" fill="var(--accent-red)" />
                    <foreignObject x="-6" y="-6" width="12" height="12">
                      <AlertTriangle size={12} style={{ color: '#fff' }} />
                    </foreignObject>
                  </>
                ) : (
                  <>
                    <circle r="12" fill="var(--bg-tertiary)" stroke="var(--accent-cyan)" strokeWidth="1.5" />
                    <circle r="8" fill="rgba(6, 186, 212, 0.15)" />
                    <foreignObject x="-6" y="-6" width="12" height="12">
                      <Bus size={12} style={{ color: 'var(--accent-cyan)' }} />
                    </foreignObject>
                  </>
                )}

                <text y="22" fontSize="9" fill={hasPanic ? 'var(--accent-red)' : 'var(--text-primary)'} fontWeight="600" textAnchor="middle">
                  {g.busNumber} {hasPanic ? '[PANIC]' : ''}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Selected Bus Info Overlay Overlay */}
        {selectedBus && (
          <div style={{
            position: 'absolute',
            bottom: '10px',
            left: '10px',
            right: '10px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--glass-border)',
            borderRadius: '10px',
            padding: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'between',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            zIndex: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '1.5px solid var(--accent-cyan)'
              }}>
                <img src={selectedBus.profilePic} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: '700' }}>
                  {selectedBus.busNumber} • {selectedBus.driverName}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  Plate: {selectedBus.plateNumber} | Route: {selectedBus.assignedRoute}
                </div>
              </div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {activeAlerts.some(a => a.guardianId === selectedBus.id && (schoolIdFilter ? !a.acknowledgedBySchoolAdmin : !a.acknowledgedBySuperAdmin)) ? (
                <span className="badge badge-danger">Panic Active</span>
              ) : (
                <span className="badge badge-success">Active</span>
              )}
              <button 
                onClick={(e) => { e.stopPropagation(); setSelectedBus(null); }}
                className="btn btn-outline"
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
