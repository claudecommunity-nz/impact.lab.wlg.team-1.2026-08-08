export const EVENT_WINDOW = {
  start: '2026-08-08T06:00:00+12:00',
  end:   '2026-08-08T14:00:00+12:00',
}

export const CATEGORIES = [
  {
    id: 'water',
    label: 'Drinking / Tap Water',
    colour: '#0ea5e9',
    radiusMetres: 200,
    durationMs: 3 * 60 * 60 * 1000,
    whatThisMeans: 'A fault or disruption to the drinking water network has been reported in this area. Tap water may be unavailable, discoloured, or unsafe to drink. Use bottled water or locate your nearest emergency water tank until Wellington Water confirms the supply is restored.',
    sources: [
      { label: 'Wellington Water Network Faults (live)', url: 'https://services7.arcgis.com/2ECs938g489DMWjt/arcgis/rest/services/Job_Status_Public_View/FeatureServer/5' },
      { label: 'Emergency Water Tank Locations (WCC)', url: 'https://services1.arcgis.com/CPYspmTk3abe6d7i/arcgis/rest/services/Emergency_Water_Tank_Location/FeatureServer/0' },
    ],
  },
  {
    id: 'trees',
    label: 'Fallen or Dangerous Trees',
    colour: '#16a34a',
    radiusMetres: 50,
    durationMs: 4 * 60 * 60 * 1000,
    whatThisMeans: 'A tree has fallen or is at risk of falling in this location. It may be blocking a road or footpath, or posing a risk to nearby structures. Keep clear of the area and do not attempt to move the tree yourself. Report to WCC if not already logged.',
    sources: [
      { label: 'Tree Cover (WCC GIS)', url: 'https://gis.wcc.govt.nz/arcgis/rest/services/Parks/TreeCover/MapServer/57' },
      { label: 'Wind Zones (WCC GIS)', url: 'https://gis.wcc.govt.nz/arcgis/rest/services/Environment/WindZones/MapServer/0' },
    ],
  },
  {
    id: 'slips',
    label: 'Slips',
    colour: '#b45309',
    radiusMetres: 150,
    durationMs: 6 * 60 * 60 * 1000,
    whatThisMeans: 'A landslip or soil movement has been reported here. Slips can block roads, damage property and create ongoing instability. Avoid the area — further movement is possible, especially during or after heavy rain. Check GW hazard layers for known slip-prone zones nearby.',
    sources: [
      { label: 'Landslide Features (GNS / WCC)', url: 'https://gis.wcc.govt.nz/arcgis/rest/services/Environment/GNSSLIDEMorphologicalData/MapServer/0' },
      { label: 'Slope Failure (GW Hazards)', url: 'https://mapping1.gw.govt.nz/arcgis/rest/services/GW/Emergencies_P/MapServer/11' },
      { label: 'Slope Degrees (WCC GIS)', url: 'https://gis.wcc.govt.nz/arcgis/rest/services/Environment/Slope/MapServer/0' },
    ],
  },
  {
    id: 'weather',
    label: 'Weather Event',
    colour: '#7c3aed',
    radiusMetres: 400,
    durationMs: 1 * 60 * 60 * 1000,
    whatThisMeans: 'A significant weather event — such as strong winds, heavy rain, or hail — is affecting or has recently affected this area. Damage to property, trees, and infrastructure is possible. Monitor MetService and WREMO for official warnings. In an emergency call 111.',
    sources: [
      { label: 'MetService Weather Alerts (live)', url: 'https://services.arcgis.com/XTtANUDT8Va4DLwI/arcgis/rest/services/Metservice_Weather_Alerts/FeatureServer/0' },
      { label: 'NEMA Emergency Mobile Alerts', url: 'https://services5.arcgis.com/cJn6oR1QqErYBL5d/arcgis/rest/services/NZ_CAP_Alerts_(Read_only)/FeatureServer/0' },
      { label: 'Rainfall Observations (GW)', url: 'https://graphs.gw.govt.nz/envmon?view=graph&collection=Rainfall&site=Berhampore%20at%20Nursery&measurement=Rainfall&interval=Hourly' },
    ],
  },
  {
    id: 'roads',
    label: 'Road & Footpath Maintenance',
    colour: '#d97706',
    radiusMetres: 80,
    durationMs: 8 * 60 * 60 * 1000,
    whatThisMeans: 'A road or footpath defect — such as a pothole, subsidence, or cracked surface — has been reported here. This may affect vehicle and pedestrian safety. Allow extra time if travelling through this area and report unlogged defects to WCC.',
    sources: [
      { label: 'Road Categories (WCC GIS)', url: 'https://gis.wcc.govt.nz/arcgis/rest/services/Transportation/Roads/MapServer/4' },
      { label: 'Footpaths (WCC GIS)', url: 'https://gis.wcc.govt.nz/arcgis/rest/services/Transportation/Roads/MapServer/2' },
      { label: 'NZTA Highway Information (live)', url: 'https://services.arcgis.com/XTtANUDT8Va4DLwI/arcgis/rest/services/NZTA_Highway_Information/FeatureServer' },
    ],
  },
  {
    id: 'flooding',
    label: 'Flooding',
    colour: '#1d4ed8',
    radiusMetres: 500,
    durationMs: 2 * 60 * 60 * 1000,
    whatThisMeans: 'Surface or road flooding has been reported in this area. Water levels can rise quickly and even shallow water can be dangerous. Do not drive or walk through floodwater. Check river level feeds and MetService for updates. If in immediate danger, call 111.',
    sources: [
      { label: 'Flood Hazard Areas (GW)', url: 'https://mapping1.gw.govt.nz/arcgis/rest/services/GW/Flood_Hazards_Areas/MapServer' },
      { label: 'Storm Surge (GW Hazards)', url: 'https://mapping1.gw.govt.nz/arcgis/rest/services/Hazards/Storm_Surge/MapServer' },
      { label: 'River Levels Viewer (GW live)', url: 'https://mapping.gw.govt.nz/GW/RiverLevels/' },
    ],
  },
]

// INCIDENTS moved to public/incidents.json — edit that file to update data.
