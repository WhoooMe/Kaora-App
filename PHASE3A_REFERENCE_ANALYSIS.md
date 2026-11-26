# KAORA Phase 3A — Reference Analysis and Mapping

## Inventory

Recursively inspected `docs/references/`: 5 files, all image assets. Image metadata: `ref-1.png` (1552×931), `ref-2.webp` (1440×1516), `ref-3.webp` (1504×1128), `ref-4.webp` (1504×1003), `ref-5.webp` (1504×1128). All five were visually inspected. Classification: five desktop agricultural/plant-care UI dashboard mockups, each containing interface mock content; none is a standalone production photograph, icon set, or illustration asset.

## Reference-to-implementation mapping

| Reference | Observed characteristics | KAORA target | Adapt | Do not copy |
|---|---|---|---|---|
| `ref-1.png` | Plant-care dashboard with dark vertical navigation, central overview, light side panel, concise metric/task cards, clear active state | Application shell, Dashboard, later history/overview work | Primary action and overview hierarchy; compact status/metric summaries; visual separation between primary and supporting information | Plant-care metrics, botanical illustration, sample task copy, exact three-column composition, dark-rail branding |
| `ref-2.webp` | Smart-farm monitoring dashboard; field photo hero with readable overlays, three analytics cards, sensor list, updates and warning | Dashboard, Monitor, future analytics components | Progression from context/summary to monitoring detail; labeled status pills and recovery-oriented alert treatment | PlantX logo, field imagery and fake sensor values, translucent overlay styling as-is, exact panel placement |
| `ref-3.webp` | Plant-store workspace with icon rail, filters, catalog grid and persistent cart summary; serif/sans pairing | Shared page/workspace layouts, future filtered History/Detection workspace | Clear functional regions, search/filter grouping, readable summary panel, deliberate heading/body hierarchy | Store/cart model, plant catalog photography, brand, exact three-column layout and small labels |
| `ref-4.webp` | Warm cream botanical dashboard, central plant illustration, supporting analytics/detail cards and dark audio panel | Global tone and future dashboard/analysis detail panels | Warm editorial surface, central subject with secondary details, restrained panel borders and spacing | Unverified care values, plant illustration as cocoa evidence, low-contrast small labels, unclear icon-only navigation |
| `ref-5.webp` | Agriculture assistant dashboard with navigation rail, weather/working-time metrics, field map, calendar and activity timeline | Dashboard, Monitor, future plot/block and activity views | Clear summary/workspace/activity separation, compact data cards, purposeful positive-state green, responsive reflow | Exact side rail shape, unknown map data, sample weather/schedule, desktop-only three-column arrangement |

## Shared design characteristics extracted

- Layout: strong page heading, clear primary workspace, grouped supporting information, repeated but not excessive panels, consistent gutters, and mobile reflow rather than desktop compression.
- Navigation: persistent orientation and unmistakable active item; icon-only controls need labels/tooltips and accessible names.
- Typography: prominent concise headings and high-salience values with readable sans-serif functional text; optional editorial display treatment must not compromise scanning.
- Color: calm light surfaces and dark readable text, with green signaling selected/healthy states and warm highlights used sparingly.
- Data: metric cards combine a prominent value with concise label/context; charts require meaningful labels/units; statuses need text as well as color.
- Interaction: clear selected, loading, success, warning, and error feedback; explicit actions and visible focus; useful reference mockups do not fully specify real app empty/error/loading states.
- Responsiveness: collapse navigation, stack cards and detail panels, retain usable controls and legible typography; do not shrink a multi-column desktop dashboard to phone width.

## KAORA decisions and implementation scope

The existing KAORA identity is retained: Leaf Green `#315B43`, Forest `#203D31`, Deep Cocoa `#38251F`, Cocoa Brown `#6B4534`, Pulp Cream `#F5F0E6`, Soft Ivory `#FCFAF5`, Harvest Gold `#D5A64A`, Terracotta `#B96E50`. Global UI aliases now use warm ivory and cocoa text with forest/leaf green for primary and active states; gold is a restrained highlight rather than a neon/lime accent. Existing Plus Jakarta Sans is retained as the product sans-serif. Existing top navigation remains; this phase does not replace it with any reference-specific rail. The shared token layer, application-wide colors/surfaces, and shell treatment are the scope; individual page compositions are deferred.

No reference assets were directly reused. All five files are UI inspiration/mockups, and their photos/illustrations and sample data are not treated as production content. Original references remain unchanged. No license/attribution metadata was present in the image files themselves; no embedded asset was introduced.
