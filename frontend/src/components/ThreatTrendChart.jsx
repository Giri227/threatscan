import React, { useState, useEffect } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Filler,
    Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Filler,
    Legend
);

const ThreatTrendChart = ({ trends }) => {
    const [chartData, setChartData] = useState({
        labels: [],
        datasets: [
            {
                fill: true,
                label: 'Threats Detected',
                data: [],
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                borderWidth: 2,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4,
                pointHoverBackgroundColor: '#8b5cf6',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2,
            },
            {
                fill: true,
                label: 'Anomalies', // visualizing total scans as secondary metric for now
                data: [],
                borderColor: '#06b6d4',
                backgroundColor: 'rgba(6, 182, 212, 0.05)',
                borderWidth: 2,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4,
                pointHoverBackgroundColor: '#06b6d4',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2,
            }
        ],
    });

    useEffect(() => {
        if (!trends) return;

        const now = new Date();
        const timeLabel = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        setChartData(prev => {
            const newLabels = [...prev.labels, timeLabel].slice(-10); // Keep last 10 points
            const newThreats = [...prev.datasets[0].data, trends.threatsDetected24h || 0].slice(-10);
            const newScans = [...prev.datasets[1].data, (trends.totalScans24h || 0) / 10].slice(-10); // Scaled down for visual comparison

            return {
                ...prev,
                labels: newLabels,
                datasets: [
                    { ...prev.datasets[0], data: newThreats },
                    { ...prev.datasets[1], data: newScans }
                ]
            };
        });
    }, [trends]);

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 0 }, // Disable animation for smooth real-time updates
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                titleFont: { size: 10, weight: 'bold', family: 'Inter' },
                bodyFont: { size: 12, family: 'Inter' },
                padding: 12,
                cornerRadius: 8,
                borderColor: 'rgba(139, 92, 246, 0.3)',
                borderWidth: 1,
            }
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { color: 'rgba(148, 163, 184, 0.5)', font: { size: 9 } }
            },
            y: {
                grid: { color: 'rgba(255, 255, 255, 0.03)', borderDash: [5, 5] },
                ticks: { color: 'rgba(148, 163, 184, 0.5)', font: { size: 9 } }
            }
        }
    };

    return (
        <div className="w-full h-full p-4">
            <Line options={options} data={chartData} />
        </div>
    );
};

export default ThreatTrendChart;
