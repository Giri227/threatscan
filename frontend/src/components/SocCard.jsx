import React from 'react';

/**
 * SocCard
 * The primary container for all panels in the SOC dashboard.
 * Enforces consistent padding, radius, border, and background.
 * 
 * @param {React.ReactNode} children - Content of the card
 * @param {string} title - Optional title for the card (uses .soc-section-title)
 * @param {string} className - Optional override classes
 */
const SocCard = ({ children, title, className = '' }) => {
    return (
        <div className={`soc-card ${className}`}>
            {title && (
                <div className="soc-section-title mb-2">
                    {title}
                </div>
            )}
            {children}
        </div>
    );
};

export default SocCard;
