#pragma once

#include <cmath>

namespace logistics {

// Earth radius in kilometers (WGS-84 mean radius)
constexpr double EARTH_RADIUS_KM = 6371.0;

inline double to_radians(double degrees) {
    return degrees * (M_PI / 180.0);
}

/**
 * Calculates the great-circle distance between two geographic coordinates
 * on Earth using the Haversine formula.
 *
 * @param lat1 Latitude of point 1 (in degrees)
 * @param lon1 Longitude of point 1 (in degrees)
 * @param lat2 Latitude of point 2 (in degrees)
 * @param lon2 Longitude of point 2 (in degrees)
 * @return Distance in kilometers
 */
inline double calculate_haversine_distance(double lat1, double lon1, double lat2, double lon2) {
    const double d_lat = to_radians(lat2 - lat1);
    const double d_lon = to_radians(lon2 - lon1);

    const double lat1_rad = to_radians(lat1);
    const double lat2_rad = to_radians(lat2);

    const double a = std::sin(d_lat / 2.0) * std::sin(d_lat / 2.0) +
                     std::cos(lat1_rad) * std::cos(lat2_rad) *
                     std::sin(d_lon / 2.0) * std::sin(d_lon / 2.0);

    const double c = 2.0 * std::atan2(std::sqrt(a), std::sqrt(1.0 - a));

    return EARTH_RADIUS_KM * c;
}

} // namespace logistics
