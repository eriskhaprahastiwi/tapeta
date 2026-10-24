# Location-First Entry

## Intent

Every entry from the TAPETA landing screen asks the visitor how to establish their context before opening Explore. TAPETA must not silently present Pekanbaru as the visitor's location.

## Required Flow

1. Selecting a landing entry action opens a location-choice dialog on desktop and mobile.
2. The dialog offers location detection, city search, and opening the Indonesia OSM map without a city context.
3. The choice is shown on every landing entry, including when a city was previously saved in the browser.
4. A detected or searched city loads its current boundary, regions, and published destinations as it does today.
5. Opening without a city context displays the Indonesia OSM map with no Pekanbaru boundary, data, city label, or fallback city identifier.
6. The unscoped map clearly states that the location has not been explored in TAPETA and offers two useful next actions: browse explored cities and become the first contributor.
7. The explored-cities action opens the city search dialog, where Pekanbaru is currently the available explored city.
8. The contribution action opens the existing contribution flow after a city has been chosen. It must not silently assign Pekanbaru.

## Constraints

- Preserve city selection, caching, saved-city behavior after a city is explicitly chosen, and existing city picker behavior outside landing entry.
- Do not alter backend schemas, APIs, authentication, or destination data.
- The dialog and unscoped state must work at desktop, 390px, and 320px with no horizontal overflow.
- All new controls need real behavior, visible keyboard focus, and 44px minimum touch targets.
