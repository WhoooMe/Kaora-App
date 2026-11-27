/**
 * Weather service for Denpasar, Bali using Open-Meteo API
 */

const DENPASAR_COORDS = {
  latitude: -8.65,
  longitude: 115.2167,
};

const TIMEZONE = 'Asia/Makassar'; // WITA timezone for Denpasar
const CACHE_KEY = 'kaora_weather_data';
const CACHE_EXPIRY = 15 * 60 * 1000; // 15 minutes in milliseconds

/**
 * Fetch current weather data for Denpasar from Open-Meteo API
 */
export async function fetchDenpasarWeather() {
  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.append('latitude', DENPASAR_COORDS.latitude);
    url.searchParams.append('longitude', DENPASAR_COORDS.longitude);
    url.searchParams.append('current', 'temperature_2m,relative_humidity_2m,precipitation');
    url.searchParams.append('hourly', 'soil_moisture_0_to_7cm');
    url.searchParams.append('timezone', TIMEZONE);
    url.searchParams.append('forecast_days', 1);
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`Weather API responded with status ${response.status}`);
    }
    
    const data = await response.json();
    
    // Validate required data
    if (!data.current || !data.current_units) {
      throw new Error('Invalid weather data structure');
    }
    
    return {
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        temperature: {
          value: data.current.temperature_2m,
          unit: data.current_units.temperature_2m,
        },
        humidity: {
          value: data.current.relative_humidity_2m,
          unit: data.current_units.relative_humidity_2m,
          type: 'air', // This is relative air humidity, not soil moisture
        },
        precipitation: {
          value: data.current.precipitation,
          unit: data.current_units.precipitation,
          interval: 'last_hour', // Open-Meteo current.precipitation is for the last hour
        },
        // Try to get soil moisture from hourly data if available
        soil_moisture: data.hourly && data.hourly.soil_moisture_0_to_7cm && data.hourly.time
          ? {
              value: data.hourly.soil_moisture_0_to_7cm[data.hourly.soil_moisture_0_to_7cm.length - 1],
              unit: data.hourly_units?.soil_moisture_0_to_7cm || 'm³/m³',
              available: true,
            }
          : {
              available: false,
              value: null,
            },
        metadata: {
          source: 'Open-Meteo',
          coordinates: DENPASAR_COORDS,
          timezone: TIMEZONE,
        },
      },
    };
  } catch (error) {
    console.error('Error fetching weather data:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Get cached weather data or fetch fresh data if expired
 */
export async function getCachedWeather() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    
    if (cached) {
      const parsed = JSON.parse(cached);
      const age = Date.now() - new Date(parsed.timestamp).getTime();
      
      if (age < CACHE_EXPIRY && parsed.success) {
        return parsed;
      }
    }
    
    // Fetch fresh data
    const freshData = await fetchDenpasarWeather();
    
    // Only cache successful responses
    if (freshData.success) {
      const cacheData = {
        ...freshData,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    }
    
    return freshData;
  } catch (error) {
    console.error('Error accessing weather cache:', error);
    return await fetchDenpasarWeather();
  }
}

/**
 * Format temperature for display
 */
export function formatTemperature(value, unit = '°C') {
  if (value === null || value === undefined) return '—';
  return `${Math.round(value)}${unit}`;
}

/**
 * Format humidity for display
 */
export function formatHumidity(value, unit = '%') {
  if (value === null || value === undefined) return '—';
  return `${Math.round(value)}${unit}`;
}

/**
 * Format precipitation for display
 */
export function formatPrecipitation(value, unit = 'mm') {
  if (value === null || value === undefined) return '—';
  const num = parseFloat(value);
  if (num === 0) return '0 mm';
  return `${num.toFixed(1)} ${unit}`;
}

/**
 * Format soil moisture for display
 */
export function formatSoilMoisture(value, unit = 'm³/m³') {
  if (value === null || value === undefined) return '—';
  const num = parseFloat(value);
  // Convert to percentage if it's in the 0-1 range
  if (num <= 1 && num >= 0) {
    return `${Math.round(num * 100)}%`;
  }
  return `${num.toFixed(2)} ${unit}`;
}