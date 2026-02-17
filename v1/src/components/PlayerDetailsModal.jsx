import React from 'react';
import { X, Trophy, Swords, Shield, Heart } from 'lucide-react';
import './PlayerDetailsModal.css';

const PlayerDetailsModal = ({ player, onClose }) => {
    if (!player) return null;

    const formatNumber = (num) => new Intl.NumberFormat('en-US').format(num);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content glass" onClick={e => e.stopPropagation()}>
                <button className="modal-close-btn" onClick={onClose}>
                    <X size={24} />
                </button>

                <div className="modal-header">
                    <h2 className="text-2xl font-bold text-gradient">{player.name}</h2>
                    <span className="badge badge-outline">{player.alliance}</span>
                    <p className="text-muted font-mono mt-1">ID: {player.id}</p>
                </div>

                <div className="modal-body">
                    <div className="detail-grid">
                        <div className="detail-card">
                            <div className="detail-icon text-blue-400"><Shield size={20} /></div>
                            <div>
                                <label>Power</label>
                                <div className="detail-value">{formatNumber(player.power)}</div>
                            </div>
                        </div>

                        <div className="detail-card">
                            <div className="detail-icon text-red-400"><Swords size={20} /></div>
                            <div>
                                <label>Kill Points</label>
                                <div className="detail-value">{formatNumber(player.kp)}</div>
                            </div>
                        </div>

                        <div className="detail-card">
                            <div className="detail-icon text-purple-400"><Trophy size={20} /></div>
                            <div>
                                <label>City Hall</label>
                                <div className="detail-value">{player.cityHall}</div>
                            </div>
                        </div>
                    </div>

                    {/* Placeholder for future detailed stats if available in other columns */}
                    <div className="mt-6 p-4 bg-white/5 rounded-lg">
                        <h4 className="text-sm font-semibold text-muted mb-2">Additional Info</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted">Rank:</span>
                                <span>#{player.rank || "N/A"}</span>
                            </div>
                            {/* Add more fields here as we parse them from the full row */}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlayerDetailsModal;
