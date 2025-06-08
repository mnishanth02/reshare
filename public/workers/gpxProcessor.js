import FitParser from "fit-file-parser";

// ==================================
// WORKER ENTRY POINT
// ==================================

self.onmessage = async (event) => {
  const { file, fileId } = event.data;

  try {
    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    let parsedData;

    console.log("File extension", fileExtension);

    switch (fileExtension) {
      case "gpx": {
        const content = await readFileAsText(file);
        console.log("Content", content);
        parsedData = parseGPX(content);
        console.log("Parsed data", parsedData);
        break;
      }
      case "tcx": {
        const content = await readFileAsText(file);
        parsedData = parseTCX(content);
        break;
      }
      case "kml": {
        const content = await readFileAsText(file);
        parsedData = parseKML(content);
        break;
      }
      case "fit": {
        const content = await readFileAsArrayBuffer(file);
        parsedData = parseFIT(content);
        break;
      }
      default:
        throw new Error(`Unsupported file format: .${fileExtension}`);
    }

    self.postMessage({
      fileId,
      success: true,
      data: parsedData,
    });
  } catch (error) {
    self.postMessage({
      fileId,
      success: false,
      error: error.message || "An unknown error occurred during parsing.",
    });
  }
};

// ==================================
// FILE READING HELPERS
// ==================================

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read file as text."));
    reader.readAsText(file);
  });
}

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read file as ArrayBuffer."));
    reader.readAsArrayBuffer(file);
  });
}

// ==================================
// PARSERS
// ==================================

/**
 * Main function to process a list of points into the final data structure.
 */
function processPoints(points, name = "Untitled Activity") {
  if (points.length === 0) {
    throw new Error("No valid GPS data found in file.");
  }

  const stats = calculateStats(points);

  const coordinates = points.map((p) =>
    p.elevation !== undefined ? [p.longitude, p.latitude, p.elevation] : [p.longitude, p.latitude]
  );

  // Use LineString for activities, MultiPoint for a set of waypoints.
  const geometry =
    points.length > 1 ? { type: "LineString", coordinates } : { type: "MultiPoint", coordinates };

  const geoJson = {
    type: "Feature",
    properties: { name, ...stats },
    geometry,
  };

  return { geoJson, stats, points, name };
}

function parseGPX(xmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, "text/xml");
  if (doc.querySelector("parsererror")) {
    throw new Error("Invalid GPX file format.");
  }

  const name =
    doc.querySelector("trk > name, rte > name, metadata > name")?.textContent?.trim() ??
    "GPX Activity";

  // Prioritize tracks > routes > waypoints
  let elements = doc.querySelectorAll("trkpt");
  if (elements.length === 0) elements = doc.querySelectorAll("rtept");
  if (elements.length === 0) elements = doc.querySelectorAll("wpt");

  const points = Array.from(elements)
    .map((pt) => {
      const lat = Number.parseFloat(pt.getAttribute("lat"));
      const lon = Number.parseFloat(pt.getAttribute("lon"));
      const ele = pt.querySelector("ele")?.textContent;
      const time = pt.querySelector("time")?.textContent;

      return {
        latitude: lat,
        longitude: lon,
        elevation: ele ? Number.parseFloat(ele) : undefined,
        timestamp: time ? new Date(time).getTime() : undefined,
      };
    })
    .filter((p) => !Number.isNaN(p.latitude) && !Number.isNaN(p.longitude));

  return processPoints(points, name);
}

function parseTCX(xmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, "text/xml");
  if (doc.querySelector("parsererror")) {
    throw new Error("Invalid TCX file format.");
  }

  const name =
    doc.querySelector("Activity > Notes, Course > Name")?.textContent?.trim() ?? "TCX Activity";
  const elements = doc.querySelectorAll("Trackpoint");

  const points = Array.from(elements)
    .map((tp) => {
      const lat = tp.querySelector("LatitudeDegrees")?.textContent;
      const lon = tp.querySelector("LongitudeDegrees")?.textContent;
      const ele = tp.querySelector("AltitudeMeters")?.textContent;
      const time = tp.querySelector("Time")?.textContent;

      return {
        latitude: lat ? Number.parseFloat(lat) : Number.NaN,
        longitude: lon ? Number.parseFloat(lon) : Number.NaN,
        elevation: ele ? Number.parseFloat(ele) : undefined,
        timestamp: time ? new Date(time).getTime() : undefined,
      };
    })
    .filter((p) => !Number.isNaN(p.latitude) && !Number.isNaN(p.longitude));

  return processPoints(points, name);
}

function parseKML(xmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, "text/xml");
  if (doc.querySelector("parsererror")) {
    throw new Error("Invalid KML file format.");
  }

  const name = doc.querySelector("Placemark > name")?.textContent?.trim() ?? "KML Track";

  // KML stores coordinates in a single text block: <coordinates>lon,lat,alt lon,lat,alt ...</coordinates>
  const coordsString = doc
    .querySelector("LineString > coordinates, Point > coordinates")
    ?.textContent?.trim();
  if (!coordsString) {
    throw new Error("No <coordinates> element found in KML file.");
  }

  const points = coordsString
    .split(/\s+/)
    .map((coordStr) => {
      const [longitude, latitude, elevation] = coordStr.split(",").map(Number.parseFloat);
      return { latitude, longitude, elevation };
    })
    .filter((p) => !Number.isNaN(p.latitude) && !Number.isNaN(p.longitude));

  return processPoints(points, name);
}

function parseFIT(arrayBuffer) {
  const fitParser = new FitParser({
    force: true,
    speedUnit: "m/s",
    lengthUnit: "m",
    temperatureUnit: "celsius",
    elapsedRecordField: true,
  });

  let fitPoints = [];

  // The parse method of FitParser is asynchronous and uses a callback.
  // We need to wrap it in a Promise to use await.
  return new Promise((resolve, reject) => {
    fitParser.parse(arrayBuffer, (err, data) => {
      if (err) {
        return reject(new Error(`Failed to parse FIT file: ${err}`));
      }

      const records = data.records || [];
      fitPoints = records
        .map((record) => ({
          latitude: record.position_lat,
          longitude: record.position_long,
          elevation: record.altitude,
          timestamp: record.timestamp ? new Date(record.timestamp).getTime() : undefined,
        }))
        .filter((p) => p.latitude !== undefined && p.longitude !== undefined);

      try {
        resolve(processPoints(fitPoints, "FIT Activity"));
      } catch (e) {
        reject(e);
      }
    });
  });
}

// ==================================
// STATS CALCULATION
// ==================================

function calculateStats(points) {
  if (points.length === 0) {
    throw new Error("Cannot calculate stats for an empty array of points.");
  }

  let totalDistance = 0;
  let totalElevationGain = 0;
  let totalElevationLoss = 0;
  let minElevation = Number.POSITIVE_INFINITY;
  let maxElevation = Number.NEGATIVE_INFINITY;
  let maxSpeed = 0;

  const timePoints = points.filter((p) => p.timestamp);
  const startTime =
    timePoints.length > 0 ? Math.min(...timePoints.map((p) => p.timestamp)) : undefined;
  const endTime =
    timePoints.length > 0 ? Math.max(...timePoints.map((p) => p.timestamp)) : undefined;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];

    // Distance
    const distance = calculateHaversineDistance(prev, curr);
    totalDistance += distance;

    // Elevation
    if (prev.elevation !== undefined && curr.elevation !== undefined) {
      const elevDiff = curr.elevation - prev.elevation;
      if (elevDiff > 0) totalElevationGain += elevDiff;
      else totalElevationLoss += Math.abs(elevDiff);

      minElevation = Math.min(minElevation, prev.elevation, curr.elevation);
      maxElevation = Math.max(maxElevation, prev.elevation, curr.elevation);
    }

    // Speed
    if (prev.timestamp && curr.timestamp && distance > 0) {
      const timeDiffSeconds = (curr.timestamp - prev.timestamp) / 1000;
      if (timeDiffSeconds > 0) {
        const speed = distance / timeDiffSeconds; // m/s
        maxSpeed = Math.max(maxSpeed, speed);
      }
    }
  }

  const duration = startTime && endTime ? (endTime - startTime) / 1000 : 0;
  const avgSpeed = duration > 0 ? totalDistance / duration : 0;

  const boundingBox = calculateBoundingBox(points);
  const center = {
    lat: (boundingBox.north + boundingBox.south) / 2,
    lng: (boundingBox.east + boundingBox.west) / 2,
  };

  return {
    distance: Math.round(totalDistance),
    duration: Math.round(duration),
    elevationGain: Math.round(totalElevationGain),
    elevationLoss: Math.round(totalElevationLoss),
    maxElevation: maxElevation === Number.NEGATIVE_INFINITY ? 0 : Math.round(maxElevation),
    minElevation: minElevation === Number.POSITIVE_INFINITY ? 0 : Math.round(minElevation),
    avgSpeed: Number.parseFloat(avgSpeed.toFixed(2)),
    maxSpeed: Number.parseFloat(maxSpeed.toFixed(2)),
    startTime,
    endTime,
    boundingBox,
    center,
  };
}

// ==================================
// UTILITY FUNCTIONS
// ==================================

function calculateHaversineDistance(p1, p2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (p1.latitude * Math.PI) / 180;
  const φ2 = (p2.latitude * Math.PI) / 180;
  const Δφ = ((p2.latitude - p1.latitude) * Math.PI) / 180;
  const Δλ = ((p2.longitude - p1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function calculateBoundingBox(points) {
  return points.reduce(
    (box, p) => ({
      north: Math.max(box.north, p.latitude),
      south: Math.min(box.south, p.latitude),
      east: Math.max(box.east, p.longitude),
      west: Math.min(box.west, p.longitude),
    }),
    { north: -90, south: 90, east: -180, west: 180 }
  );
}
