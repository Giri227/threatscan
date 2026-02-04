const axios = require('axios');
const logger = require('../utils/logger');

async function getClientInfo(ip) {
    try {
        // Try ip-api.com first (Primary)
        // NOTE: HTTP only for free tier
        try {
            const response = await axios.get(`http://ip-api.com/json/${ip}`, { timeout: 4000 });
            const data = response.data;

            if (data.status === 'success') {
                logger.info('IP geolocation (ip-api.com) successful', { ip, country: data.country });
                return {
                    ip: data.query,
                    isp: data.isp,
                    org: data.org,
                    country: data.country,
                    city: data.city,
                    region: data.regionName,
                    lat: data.lat,
                    lon: data.lon,
                    as: data.as
                };
            }
        } catch (e) {
            logger.warn('Primary Geo API failed, trying fallback', { error: e.message });
        }

        // Fallback: ipapi.co (HTTPS supported on free tier)
        try {
            const fallback = await axios.get(`https://ipapi.co/${ip}/json/`, { timeout: 4000 });
            const fData = fallback.data;

            if (!fData.error) {
                logger.info('IP geolocation (ipapi.co) successful', { ip, country: fData.country_name });
                return {
                    ip: fData.ip,
                    isp: fData.org,
                    org: fData.org,
                    country: fData.country_name,
                    city: fData.city,
                    region: fData.region,
                    lat: fData.latitude,
                    lon: fData.longitude,
                    as: fData.asn
                };
            }
        } catch (e) {
            logger.error('Fallback Geo API failed', { error: e.message });
        }

        return { ip: ip, message: 'Geo info unavailable' };
    } catch (error) {
        logger.error('IP geolocation service fatal error', { ip, error: error.message });
        return { ip: ip, error: error.message };
    }
}

module.exports = { getClientInfo };
