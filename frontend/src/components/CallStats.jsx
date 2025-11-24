import React, { useState, useEffect } from 'react';
import { Signal, Wifi, WifiOff } from 'lucide-react';

export const CallStats = ({ peerConnection }) => {
  const [stats, setStats] = useState({
    bitrate: 0,
    packetsLost: 0,
    jitter: 0,
    latency: 0
  });

  useEffect(() => {
    if (!peerConnection) return;

    const getStats = async () => {
      try {
        const statsReport = await peerConnection.getStats();
        let videoBitrate = 0;
        let audioBitrate = 0;
        let packetsLost = 0;
        let jitter = 0;
        let rtt = 0;

        statsReport.forEach(report => {
          if (report.type === 'inbound-rtp') {
            if (report.kind === 'video') {
              videoBitrate = Math.round(report.bytesReceived * 8 / 1000);
            } else if (report.kind === 'audio') {
              audioBitrate = Math.round(report.bytesReceived * 8 / 1000);
              packetsLost = report.packetsLost || 0;
              jitter = (report.jitter * 1000).toFixed(2);
            }
          }
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            rtt = (report.currentRoundTripTime * 1000).toFixed(2);
          }
        });

        setStats({
          bitrate: videoBitrate + audioBitrate,
          packetsLost,
          jitter,
          latency: rtt
        });
      } catch (error) {
        console.error('Error getting stats:', error);
      }
    };

    const interval = setInterval(getStats, 1000);
    return () => clearInterval(interval);
  }, [peerConnection]);

  return (
    <div className="text-xs text-gray-400 space-y-1 p-2 bg-gray-900 rounded border border-gray-700">
      <div className="flex items-center gap-1">
        <Signal size={12} />
        <span>Bitrate: {stats.bitrate} kbps</span>
      </div>
      <div>Latency: {stats.latency} ms</div>
      <div>Jitter: {stats.jitter} ms</div>
      <div>Packets Lost: {stats.packetsLost}</div>
    </div>
  );
};