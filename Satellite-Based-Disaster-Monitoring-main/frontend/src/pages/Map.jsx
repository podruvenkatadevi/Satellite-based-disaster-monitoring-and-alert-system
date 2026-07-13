import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Topbar from '../components/Topbar.jsx'
import Icon from '../components/Icons.jsx'
import { api } from '../api.js'
import { TYPE_COLORS } from '../themes.js'

export default function MapPage() {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, { zoomControl: true }).setView([20.5937, 78.9629], 5)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 18,
    }).addTo(map)
    mapRef.current = map
    layerRef.current = L.layerGroup().addTo(map)

    // Leaflet sometimes mis-sizes inside flex layouts until explicitly invalidated.
    setTimeout(() => map.invalidateSize(), 0)

    return () => {
      map.remove()
      mapRef.current = null
      layerRef.current = null
    }
  }, [])

  const load = () => {
    api.disasters().then(({ items }) => {
      if (!layerRef.current || !mapRef.current) return
      layerRef.current.clearLayers()
      const points = items.filter((r) => r.type !== 'Normal' && r.latitude != null && r.longitude != null)
      points.forEach((r) => {
        const color = TYPE_COLORS[r.type] || '#64748b'
        const marker = L.circleMarker([r.latitude, r.longitude], {
          radius: 9,
          color,
          fillColor: color,
          fillOpacity: 0.85,
          weight: 2,
        })
        marker.bindPopup(
          `<b>${r.type}</b> · ${r.severity}<br/>${r.location}<br/><a href="/reports/${r.id}">View details</a>`
        )
        marker.addTo(layerRef.current)
      })
      if (points.length > 0) {
        const bounds = L.latLngBounds(points.map((p) => [p.latitude, p.longitude]))
        mapRef.current.fitBounds(bounds.pad(0.25))
      }
      mapRef.current.invalidateSize()
    }).catch(() => {})
  }

  useEffect(() => { load() }, [])

  return (
    <div className="fade-in">
      <Topbar title="Disaster Map" subtitle="Interactive map of detected incidents across India" />
      <div className="card map-card">
        <div className="row" style={{ marginBottom: 12, justifyContent: 'space-between' }}>
          <div className="row map-legend">
            {['Flood', 'Fire', 'Cyclone'].map((t) => (
              <span key={t} className="map-legend-item">
                <span className="map-legend-dot" style={{ background: TYPE_COLORS[t] }} /> {t}
              </span>
            ))}
          </div>
          <button className="btn ghost sm" onClick={load}><Icon name="refresh" size={15} /> Refresh</button>
        </div>
        <div ref={containerRef} className="map-container" />
        <p className="faint mt" style={{ fontSize: 12 }}>
          Click a marker for details. <Link to="/reports" style={{ color: 'var(--accent)' }}>Open full reports →</Link>
        </p>
      </div>
    </div>
  )
}
