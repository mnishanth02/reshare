---
trigger: model_decision
description: when model wants to know a overview of the project what we are building
---

ReShare: An Application Plan
ReShare is a web application designed for outdoor enthusiasts to transform their GPX activity data into visually appealing images and interactive experiences. This plan outlines the technical specifications, user workflows, non-functional requirements, and a finalized technology stack, prioritizing modern, cost-effective, and open-source solutions.

Core Features
ReShare focuses on three core pillars: Journey Management, Activity Handling, and Interactive Map & Export.

Journey Management
Users can create, edit, list, search, duplicate, and archive journeys. Each journey acts as a container for activities, allowing users to set default map styles, activity color palettes, privacy settings, and a default activity type. The dashboard provides a card-based view with infinite scroll, while bulk actions enhance efficiency. Basic journey analytics offer insights into total distance, activity count, and duration.

Activity Handling
GPX upload supports batch processing with a drag-and-drop interface and client-side preprocessing via Web Workers. The system robustly parses GPX, TCX, and KML formats, with fallbacks for malformed files. An advanced GPX processing pipeline on both client and server sides handles route simplification and elevation data. Activities are auto-segregated and grouped by date, with smart grouping by activity type and geographical proximity. The activity list provides a small thumbnail preview, editable name, date, and calculated stats, supporting virtual scrolling. A detailed activity view offers comprehensive stats, an interactive elevation profile, and potential weather data integration. Users can rename activities, assign types, customize colors, and add notes.

Interactive Map & Export
The central map, powered by MapLibre GL JS 4.x, automatically centers and zooms to encompass all activities in a journey. It leverages free and open-source map data sources like OpenStreetMap and NASA SRTM. Users can choose from built-in map styles or use a custom style editor. Dynamic route rendering ensures smooth display of numerous activities with level-of-detail rendering and clustering. Activity highlighting and focusing allow for detailed exploration, and advanced map features include measurement tools, fullscreen mode, 3D terrain, and route animation. Performance optimizations such as tile caching, route simplification, and lazy loading ensure a fluid experience.

The Customization & Export section enables users to generate static images via a server-side MapLibre rendering pipeline. An advanced canvas editor, built with Konva.js, provides a real-time preview and layer management. It offers text elements with rich formatting and dynamic data, image overlays, basic shapes & graphics, and data visualizations like elevation profiles. Advanced editing features include an undo/redo system, keyboard shortcuts, grid and guides, and multi-selection. Users can leverage a template library and brand kits. Export & sharing capabilities support multiple formats (PNG, JPEG, WebP, SVG, PDF) and platform-specific sizing for social media integration.