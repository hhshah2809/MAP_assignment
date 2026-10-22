#pragma once

#include <string>
#include <vector>
#include <chrono>
#include <iomanip>
#include <sstream>
#include "haversine.hpp"
#include "json.hpp"

namespace logistics {

struct PredictionRequest {
    std::string shipmentId;
    double currentLat = 0.0;
    double currentLon = 0.0;
    double destLat = 0.0;
    double destLon = 0.0;
    double currentSpeedKmh = 0.0;
    double averageSpeedKmh = 65.0;
    std::string scheduledDelivery; // ISO 8601 string, e.g. "2026-10-22T16:00:00Z"
};

struct PredictionResult {
    std::string shipmentId;
    double remainingDistanceKm = 0.0;
    double effectiveSpeedKmh = 0.0;
    double estimatedTravelHours = 0.0;
    std::string estimatedDelivery;
    std::string riskLevel; // LOW, MEDIUM, HIGH, CRITICAL
    double delayRiskScore = 0.0; // 0.0 - 1.0
    std::vector<std::string> explanatoryFactors;

    nlohmann::json to_json() const {
        return {
            {"shipmentId", shipmentId},
            {"remainingDistanceKm", remainingDistanceKm},
            {"effectiveSpeedKmh", effectiveSpeedKmh},
            {"estimatedTravelHours", estimatedTravelHours},
            {"estimatedDelivery", estimatedDelivery},
            {"riskLevel", riskLevel},
            {"delayRiskScore", delayRiskScore},
            {"explanatoryFactors", explanatoryFactors}
        };
    }
};

inline std::time_t portable_timegm(std::tm* tm) {
#if defined(_WIN32)
    return _mkgmtime(tm);
#else
    return timegm(tm);
#endif
}

class PredictionEngine {
public:
    static PredictionResult predict(const PredictionRequest& req) {
        PredictionResult result;
        result.shipmentId = req.shipmentId;

        // 1. Calculate remaining distance
        result.remainingDistanceKm = calculate_haversine_distance(
            req.currentLat, req.currentLon, req.destLat, req.destLon
        );
        // Round to 1 decimal place
        result.remainingDistanceKm = std::round(result.remainingDistanceKm * 10.0) / 10.0;

        // 2. Determine effective speed
        double avgSpeed = req.averageSpeedKmh > 10.0 ? req.averageSpeedKmh : 60.0;
        if (req.currentSpeedKmh > 10.0) {
            result.effectiveSpeedKmh = (req.currentSpeedKmh * 0.4) + (avgSpeed * 0.6);
        } else {
            result.effectiveSpeedKmh = avgSpeed;
        }
        result.effectiveSpeedKmh = std::round(result.effectiveSpeedKmh * 10.0) / 10.0;

        // 3. Compute estimated transit time
        double speedToUse = std::max(result.effectiveSpeedKmh, 15.0);
        result.estimatedTravelHours = result.remainingDistanceKm / speedToUse;
        result.estimatedTravelHours = std::round(result.estimatedTravelHours * 100.0) / 100.0;

        // 4. Calculate ETA Timestamp (now + travel time)
        auto now = std::chrono::system_clock::now();
        auto eta_tp = now + std::chrono::duration_cast<std::chrono::system_clock::duration>(
            std::chrono::duration<double, std::ratio<3600>>(result.estimatedTravelHours)
        );

        std::time_t eta_time = std::chrono::system_clock::to_time_t(eta_tp);
        std::stringstream ss;
        ss << std::put_time(std::gmtime(&eta_time), "%Y-%m-%dT%H:%M:%SZ");
        result.estimatedDelivery = ss.str();

        // 5. Evaluate Risk Level and Explanatory Factors
        result.explanatoryFactors.push_back(
            "Haversine remaining distance: " + std::to_string(static_cast<int>(result.remainingDistanceKm)) +
            " km at effective speed " + std::to_string(static_cast<int>(result.effectiveSpeedKmh)) + " km/h."
        );

        if (req.currentSpeedKmh < 5.0 && result.remainingDistanceKm > 10.0) {
            result.explanatoryFactors.push_back("Vehicle currently stationary or delayed in congestion.");
        }

        // Assess against scheduled SLA
        if (!req.scheduledDelivery.empty()) {
            std::tm scheduled_tm = {};
            std::istringstream sched_ss(req.scheduledDelivery);
            sched_ss >> std::get_time(&scheduled_tm, "%Y-%m-%dT%H:%M:%S");

            if (!sched_ss.fail()) {
                std::time_t scheduled_time = portable_timegm(&scheduled_tm);
                double slackSeconds = std::difftime(scheduled_time, eta_time);
                double slackHours = slackSeconds / 3600.0;

                if (slackHours > 1.0) {
                    result.riskLevel = "LOW";
                    result.delayRiskScore = 0.12;
                    result.explanatoryFactors.push_back(
                        "On schedule: ETA is " + std::to_string(std::round(slackHours * 10.0) / 10.0) +
                        " hours ahead of scheduled delivery."
                    );
                } else if (slackHours >= 0.0) {
                    result.riskLevel = "MEDIUM";
                    result.delayRiskScore = 0.45;
                    result.explanatoryFactors.push_back(
                        "Moderate risk: Tight delivery margin (" +
                        std::to_string(std::round(slackHours * 60.0)) + " minutes buffer remaining)."
                    );
                } else if (slackHours >= -2.0) {
                    result.riskLevel = "HIGH";
                    result.delayRiskScore = 0.78;
                    result.explanatoryFactors.push_back(
                        "High risk: Projected delay of " +
                        std::to_string(std::round(std::abs(slackHours) * 10.0) / 10.0) +
                        " hours beyond scheduled window."
                    );
                } else {
                    result.riskLevel = "CRITICAL";
                    result.delayRiskScore = 0.95;
                    result.explanatoryFactors.push_back(
                        "Critical delay: Projected arrival exceeds SLA by over " +
                        std::to_string(std::round(std::abs(slackHours) * 10.0) / 10.0) + " hours."
                    );
                }
            } else {
                result.riskLevel = "LOW";
                result.delayRiskScore = 0.20;
                result.explanatoryFactors.push_back("Scheduled delivery date format unparseable; default baseline applied.");
            }
        } else {
            // No scheduled delivery provided
            result.riskLevel = "LOW";
            result.delayRiskScore = 0.15;
            result.explanatoryFactors.push_back("No strict SLA deadline specified for shipment.");
        }

        return result;
    }
};

} // namespace logistics
