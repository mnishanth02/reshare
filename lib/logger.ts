// Unified logging utility for debugging file uploads and processing
// NOTE: This is a development utility - consider removing/simplifying for production

const LOG_PREFIX = "[GPX-UPLOAD]";
const ENABLED = true; // Set to false to disable all logging

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

type LogLevel = "info" | "warn" | "error" | "debug" | "success";

interface LogOptions {
  fileId?: string;
  journeyId?: string;
  activityId?: string;
  [key: string]: string | number | boolean | undefined;
}

// Define a type for the log function's options
type LogFunctionOptions = Omit<LogOptions, "fileId" | "journeyId" | "activityId"> & {
  [key: string]: string | number | boolean | undefined;
};

export const logger = {
  log: (message: string, level: LogLevel = "info", options: LogFunctionOptions = {}) => {
    if (!ENABLED) return;

    const timestamp = new Date().toISOString();
    const { fileId, journeyId, activityId, ...rest } = options;

    // Format the message with colors
    let formattedMessage = `${colors.dim}[${timestamp}]${colors.reset} ${LOG_PREFIX} `;

    // Add level with color
    switch (level) {
      case "success":
        formattedMessage += `${colors.green}✓${colors.reset} `;
        break;
      case "warn":
        formattedMessage += `${colors.yellow}⚠${colors.reset} `;
        break;
      case "error":
        formattedMessage += `${colors.red}✗${colors.reset} `;
        break;
      case "debug":
        formattedMessage += `${colors.blue}⚡${colors.reset} `;
        break;
      default:
        formattedMessage += `${colors.cyan}ℹ${colors.reset} `;
    }

    // Add the main message
    formattedMessage += message;

    // Add metadata
    const metadata: string[] = [];
    if (fileId) metadata.push(`fileId: ${fileId}`);
    if (journeyId) metadata.push(`journeyId: ${journeyId}`);
    if (activityId) metadata.push(`activityId: ${activityId}`);

    // Add any additional metadata
    const extraData = Object.entries(rest)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`);

    metadata.push(...extraData);

    if (metadata.length > 0) {
      formattedMessage += ` ${colors.dim}(${metadata.join(", ")})${colors.reset}`;
    }

    // Log with appropriate console method
    switch (level) {
      case "error":
        console.error(formattedMessage);
        break;
      case "warn":
        console.warn(formattedMessage);
        break;
      case "debug":
        console.debug(formattedMessage);
        break;
      default:
        console.log(formattedMessage);
    }
  },

  // Convenience methods
  info: (message: string, options?: LogOptions) => logger.log(message, "info", options),
  warn: (message: string, options?: LogOptions) => logger.log(message, "warn", options),
  error: (message: string, options?: LogOptions) => logger.log(message, "error", options),
  debug: (message: string, options?: LogOptions) => logger.log(message, "debug", options),
  success: (message: string, options?: LogOptions) => logger.log(message, "success", options),

  // Debug utility for detailed data inspection
  debugProcessedData: (data: unknown, fileName: string) => {
    if (!ENABLED) return;

    const parsedData = data as Record<string, unknown>;

    console.group(`🔍 Debug: GPX Data for ${fileName}`);

    console.log("📊 Overall structure:", {
      hasGeoJson: !!parsedData.geoJson,
      hasStats: !!parsedData.stats,
      hasPoints: !!parsedData.points,
      hasName: !!parsedData.name,
      topLevelKeys: Object.keys(parsedData),
    });

    if (parsedData.stats && typeof parsedData.stats === "object") {
      const stats = parsedData.stats as Record<string, unknown>;
      console.log("📈 Stats structure:", {
        keys: Object.keys(stats),
        values: Object.entries(stats).reduce(
          (acc, [key, value]) => {
            acc[key] =
              typeof value === "object" && value !== null ? Object.keys(value) : typeof value;
            return acc;
          },
          {} as Record<string, string | string[]>
        ),
      });
    }

    if (parsedData.geoJson && typeof parsedData.geoJson === "object") {
      const geoJson = parsedData.geoJson as Record<string, unknown>;
      const geometry = geoJson.geometry as Record<string, unknown> | undefined;
      const properties = geoJson.properties as Record<string, unknown> | undefined;

      console.log("🗺️ GeoJSON structure:", {
        type: geoJson.type,
        geometryType: geometry?.type,
        coordinatesLength: Array.isArray(geometry?.coordinates)
          ? geometry.coordinates.length
          : "not array",
        propertiesKeys: properties ? Object.keys(properties) : [],
      });
    }

    if (Array.isArray(parsedData.points)) {
      const points = parsedData.points as Record<string, unknown>[];
      console.log("📍 Points structure:", {
        count: points.length,
        firstPoint: points[0],
        lastPoint: points[points.length - 1],
        sampleKeys: points[0] ? Object.keys(points[0]) : [],
      });
    }

    console.groupEnd();
  },

  // Group logging for better organization
  group: (name: string) => {
    if (!ENABLED) return;
    console.group(`${LOG_PREFIX} ${name}`);
  },

  groupEnd: () => {
    if (!ENABLED) return;
    console.groupEnd();
  },
};

// Legacy export for backward compatibility during transition
export const uploadLogger = logger;
export const debugProcessedData = logger.debugProcessedData;
