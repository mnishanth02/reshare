# Activity File Formats Implementation

## Overview

Enhanced the activity processing system to support multiple fitness file formats commonly used by GPS devices and fitness applications. The system now processes GPX, TCX, FIT, KML, and KMZ files robustly with proper error handling and parallel processing capabilities.

## Supported File Formats

### 1. GPX (GPS Exchange Format)
- **Extension**: `.gpx`
- **MIME Type**: `application/gpx+xml`
- **Description**: XML-based format for GPS data exchange
- **Use Case**: Most common format for GPS tracks, routes, and waypoints
- **Processing**: XML parsing using @xmldom/xmldom

### 2. TCX (Training Center XML)
- **Extension**: `.tcx`
- **MIME Type**: `application/vnd.garmin.tcx+xml`
- **Description**: Garmin's XML format for fitness activities
- **Use Case**: Activity data with heart rate, cadence, calories
- **Processing**: XML parsing with activity-specific metadata

### 3. FIT (Flexible and Interoperable Data Transfer)
- **Extension**: `.fit`
- **MIME Type**: `application/octet-stream`
- **Description**: Binary format by Garmin for compact data storage
- **Use Case**: High-resolution activity data from fitness devices
- **Processing**: Binary parsing using fit-file-parser library

### 4. KML (Keyhole Markup Language)
- **Extension**: `.kml`
- **MIME Type**: `application/vnd.google-earth.kml+xml`
- **Description**: XML format for geographic visualization
- **Use Case**: GPS tracks with visualization features
- **Processing**: XML parsing with coordinate extraction

### 5. KMZ (Compressed KML)
- **Extension**: `.kmz`
- **MIME Type**: `application/vnd.google-earth.kmz`
- **Description**: Zipped KML files
- **Use Case**: Compressed GPS tracks with embedded resources
- **Processing**: ZIP extraction followed by KML parsing

## Implementation Details

### Dependencies Added
```json
{
  "fit-file-parser": "^1.21.0",  // FIT file processing
  "jszip": "^3.10.1",            // KMZ file extraction
  "@xmldom/xmldom": "^0.9.8"     // XML parsing for GPX/TCX/KML
}
```

### Key Components Updated

#### 1. `convex/activities/actions.ts`
- Added `"use node"` directive for Node.js modules
- Implemented parsers for all file formats:
  - `parseGPX()` - GPX file parsing
  - `parseTCX()` - TCX file parsing with fixed return mapping
  - `parseFIT()` - Binary FIT file parsing with Promise-based API
  - `parseKML()` - KML coordinate parsing (LineString and Point support)
  - `parseKMZ()` - ZIP extraction and KML parsing
- Enhanced `processActivityFile()` action to handle binary and text formats
- Added activity type detection based on speed analysis
- Improved error handling with proper type safety

#### 2. `components/common/gpx-uploader.tsx`
- Renamed component from `GpxUploader` to `ActivityUploader`
- Updated file acceptance: `.gpx,.tcx,.fit,.kml,.kmz`
- Increased file size limit to 50MB for FIT files
- Updated UI text to reflect multiple formats
- Maintained backward compatibility with `GpxUploader` export

#### 3. `hooks/use-gpx-processor.ts`
- Already configured for 50MB file limit
- Handles all file formats through the existing pipeline
- Maintains parallel processing capabilities

### File Processing Flow

1. **File Upload**: Client uploads activity file to Convex storage
2. **Format Detection**: File extension determines parser
3. **Parsing**: 
   - Text formats (GPX, TCX, KML): Use `file.text()`
   - Binary formats (FIT, KMZ): Use `file.arrayBuffer()`
4. **Data Processing**: Extract GPS points, calculate statistics
5. **GeoJSON Generation**: Convert to standardized GeoJSON format
6. **Database Storage**: Save processed data to Convex

### Activity Type Detection

Implemented automatic activity type detection based on speed analysis:
- **Cycling**: Max speed > 50 km/h or avg speed > 15 km/h
- **Running**: Avg speed > 8 km/h
- **Hiking**: Avg speed > 3 km/h
- **Walking**: Default for lower speeds

### Error Handling Improvements

1. **Type Safety**: Replaced `any` types with proper type assertions
2. **Error Messages**: Descriptive error messages for each format
3. **Graceful Failures**: Failed activities are marked in database
4. **Memory Management**: Proper handling of large binary files

### Performance Optimizations

1. **Parallel Processing**: Multiple files processed concurrently
2. **Memory Efficiency**: Streaming approach for large files where possible
3. **Format-Specific Optimizations**: Different handling for binary vs text formats
4. **Robust Statistics**: Efficient calculation of distance, elevation, speed metrics

## Usage Examples

### Basic Upload
```tsx
<ActivityUploader journeyId={journeyId} />
```

### Minimal Variant
```tsx
<ActivityUploader journeyId={journeyId} variant="minimal" />
```

### File Size Limits
- Individual file: 50MB max
- Concurrent uploads: 5 files max
- Supported formats: GPX, TCX, FIT, KML, KMZ

## Testing Recommendations

1. **Format Testing**: Test with sample files from each format
2. **Size Testing**: Test with large FIT files (10MB+)
3. **Error Testing**: Test with corrupted/invalid files
4. **Parallel Testing**: Upload multiple files simultaneously
5. **Activity Detection**: Verify correct activity type classification

## Future Enhancements

1. **Streaming Parsers**: For extremely large files (>100MB)
2. **Additional Formats**: Support for Strava JSON, Polar files
3. **Advanced Metrics**: Power data, heart rate zones
4. **Compression**: Optional compression for large track data
5. **Format Conversion**: Convert between different formats

## Migration Notes

- Component renamed but backward compatible
- No database schema changes required
- Existing GPX processing remains unchanged
- All new formats follow same data structure
