/* ============================================
   Life OS — Travel Map (Leaflet)
   ============================================ */

const TravelMap = (() => {
  let _map = null;
  let _markers = [];
  let _countryLayer = null;
  let _countriesData = null;
  let _currentCategory = null;
  let _currentStatuses = [];
  let _activeFilters = {
    Completed: true,
    Visited: true,
    Planned: true,
    "Want to Go": true,
  };
  const STATUS_COLORS = {
    Completed: "#98AA6D",
    Visited: "#98AA6D",
    Planned: "#93B2BB",
    "Want to Go": "#DDAB63",
  };

  const COUNTRIES_URL =
    "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson";

  // --- Render the map view ---
  function render(containerId, items, category) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Detect available statuses from category schema
    const schema = (category && category.schema) || [];
    const statusField = schema.find((f) => f.key === "status");
    const statuses = statusField
      ? statusField.options
      : ["Completed", "Planned", "Want to Go"];

    // Init filters for available statuses
    statuses.forEach((s) => {
      if (_activeFilters[s] === undefined) _activeFilters[s] = true;
    });

    // Status display labels
    const labels = {
      "Want to Go": "Wishlist",
      Completed: "Completed",
      Visited: "Visited",
      Planned: "Planned",
    };

    container.innerHTML = `
      <div class="map-filters">
        ${statuses
          .map((status) => {
            const color = STATUS_COLORS[status] || "#98AA6D";
            const label = labels[status] || status;
            return `
          <button class="map-filter-btn ${_activeFilters[status] ? "active" : ""}"
                  style="${_activeFilters[status] ? `background:${color};color:#fff;border-color:${color}` : ""}"
                  onclick="TravelMap.toggleFilter('${status}','${containerId}')">
            <span class="map-filter-dot" style="background:${color}"></span>
            ${label}
          </button>`;
          })
          .join("")}
      </div>
      <div id="travel-map" style="width:100%;height:400px;border-radius:var(--radius-md);overflow:hidden;margin-top:var(--space-sm)"></div>
      <div class="map-stats" id="map-stats"></div>
    `;

    _currentCategory = category;
    _currentStatuses = statuses;
    setTimeout(() => _initMap(items), 100);
  }

  function _initMap(items) {
    const mapEl = document.getElementById("travel-map");
    if (!mapEl) return;

    // Destroy previous
    if (_map) {
      _map.remove();
      _map = null;
    }

    _map = L.map("travel-map", {
      zoomControl: false,
      attributionControl: false,
    }).setView([35, 25], 3);

    L.control.zoom({ position: "bottomright" }).addTo(_map);

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      {
        maxZoom: 18,
      },
    ).addTo(_map);

    // Load countries GeoJSON, then add markers
    _loadCountries(items);
    _addMarkers(items);
    _renderStats(items);
  }

  async function _loadCountries(items) {
    if (!_countriesData) {
      try {
        const resp = await fetch(COUNTRIES_URL);
        _countriesData = await resp.json();
      } catch (e) {
        console.error("Failed to load countries GeoJSON:", e);
        return;
      }
    }

    // Find which countries have visits
    const visitedCountries = {};
    for (const item of items) {
      if (item.data.country && item.data.status) {
        const existing = visitedCountries[item.data.country];
        // Priority: Completed > Planned > Want to Go
        if (
          !existing ||
          _statusPriority(item.data.status) > _statusPriority(existing)
        ) {
          visitedCountries[item.data.country] = item.data.status;
        }
      }
    }

    if (_countryLayer) {
      _map.removeLayer(_countryLayer);
    }

    _countryLayer = L.geoJSON(_countriesData, {
      style: (feature) => {
        const name = feature.properties.ADMIN || feature.properties.name;
        const status = visitedCountries[name];
        if (status && _activeFilters[status]) {
          return {
            fillColor: STATUS_COLORS[status],
            fillOpacity: 0.25,
            weight: 1,
            color: STATUS_COLORS[status],
            opacity: 0.5,
          };
        }
        return {
          fillColor: "transparent",
          fillOpacity: 0,
          weight: 0.3,
          color: "#ccc",
        };
      },
      onEachFeature: (feature, layer) => {
        const name = feature.properties.ADMIN || feature.properties.name;
        const status = visitedCountries[name];
        if (status) {
          layer.bindTooltip(name, { sticky: true, className: "map-tooltip" });
        }
      },
    }).addTo(_map);
  }

  function _statusPriority(status) {
    return { "Want to Go": 1, Planned: 2, Completed: 3 }[status] || 0;
  }

  function _addMarkers(items) {
    // Clear old markers
    _markers.forEach((m) => _map.removeLayer(m));
    _markers = [];

    for (const item of items) {
      const d = item.data;
      if (!d.latitude || !d.longitude) continue;
      if (!_activeFilters[d.status]) continue;

      const color = STATUS_COLORS[d.status] || "#98AA6D";

      // Custom icon
      const icon = L.divIcon({
        className: "map-pin-custom",
        html: `
          <div class="map-pin" style="background:${color}">
            ${
              d.photo
                ? `<div class="map-pin-photo" style="background-image:url('${d.photo}')"></div>`
                : `<span>✈</span>`
            }
          </div>
          <div class="map-pin-arrow" style="border-top-color:${color}"></div>
        `,
        iconSize: [40, 50],
        iconAnchor: [20, 50],
        popupAnchor: [0, -50],
      });

      const marker = L.marker(
        [parseFloat(d.latitude), parseFloat(d.longitude)],
        { icon },
      ).addTo(_map);

      // Popup
      const popupHtml = `
        <div class="map-popup">
          ${d.photo ? `<div class="map-popup-photo" style="background-image:url('${d.photo}')"></div>` : ""}
          <div class="map-popup-body">
            <strong>${_esc(d.destination || "Untitled")}</strong>
            ${d.country ? `<div style="font-size:12px;color:#6b7a6c">${_esc(d.country)}</div>` : ""}
            <span class="map-popup-status" style="background:${color}">${d.status || ""}</span>
            ${d.notes ? `<p style="font-size:12px;margin-top:6px;color:#455546">${_esc(d.notes).substring(0, 80)}</p>` : ""}
          </div>
        </div>
      `;
      marker.bindPopup(popupHtml, {
        maxWidth: 220,
        className: "map-popup-container",
      });

      _markers.push(marker);
    }

    // Fit bounds if markers exist
    if (_markers.length > 0) {
      const group = L.featureGroup(_markers);
      _map.fitBounds(group.getBounds().pad(0.2));
    }
  }

  function _renderStats(items) {
    const statsEl = document.getElementById("map-stats");
    if (!statsEl) return;

    const labels = {
      "Want to Go": "Wishlist",
      Completed: "Completed",
      Visited: "Visited",
      Planned: "Planned",
    };
    const countries = new Set(
      items
        .filter(
          (i) =>
            i.data.country &&
            (i.data.status === "Completed" || i.data.status === "Visited"),
        )
        .map((i) => i.data.country),
    ).size;

    let html = `<div class="map-stat"><span class="map-stat-num">${countries}</span>Countries</div>`;
    for (const status of _currentStatuses) {
      const count = items.filter((i) => i.data.status === status).length;
      const color = STATUS_COLORS[status] || "#98AA6D";
      const label = labels[status] || status;
      html += `<div class="map-stat"><span class="map-stat-num" style="color:${color}">${count}</span>${label}</div>`;
    }
    statsEl.innerHTML = html;
  }

  function toggleFilter(status, containerId) {
    _activeFilters[status] = !_activeFilters[status];
    if (_currentCategory) {
      const items = State.getCategoryItems(_currentCategory.id);
      render(containerId, items, _currentCategory);
    }
  }

  function _esc(str) {
    if (typeof str !== "string") return "";
    const el = document.createElement("span");
    el.textContent = str;
    return el.innerHTML;
  }

  return { render, toggleFilter };
})();
