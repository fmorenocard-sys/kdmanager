import React from 'react';
import {
    X, Shield, Trophy, Activity, MapPin,
    Swords, Skull, Users, Hammer, ScrollText
} from 'lucide-react';
import './PlayerSidePanel.css';

const PlayerSidePanel = ({ player, onClose }) => {
    if (!player) return null;

    // Helper to format numbers
    const format = (num) => new Intl.NumberFormat('en-US').format(num);

    return (
        <div className="side-panel-overlay" onClick={onClose}>
            <div className={`side-panel glass ${player ? 'open' : ''}`} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="panel-header">
                    <button className="close-btn" onClick={onClose}>
                        <X size={24} />
                    </button>
                    <div className="player-identity">
                        <div className="avatar-placeholder">
                            {player.name.charAt(0).toUpperCase()}
                        </div>
                        <h2>{player.name}</h2>
                        <span className="alliance-badge">{player.alliance}</span>
                        <div className="id-tag">ID: {player.id}</div>
                    </div>
                </div>

                {/* Content Scroll Area */}
                <div className="panel-content">

                    {/* Main Stats */}
                    <div className="stats-highlight-grid">
                        <div className="highlight-card power">
                            <div className="icon"><Activity size={20} /></div>
                            <div className="data">
                                <label>Power</label>
                                <span>{format(player.power)}</span>
                                {player.powerDiff !== 0 && (
                                    <span className={`diff ${player.powerDiff > 0 ? 'pos' : 'neg'}`}>
                                        {player.powerDiff > 0 ? '+' : ''}{format(player.powerDiff)}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="highlight-card kp">
                            <div className="icon"><Swords size={20} /></div>
                            <div className="data">
                                <label>Kill Points</label>
                                <span>{format(player.kp)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Combat Stats */}
                    <div className="section-title"><Skull size={18} /> Combat Statistics</div>
                    <div className="stats-grid">
                        <div className="stat-item">
                            <label>Deads</label>
                            <span>{format(player.deads)}</span>
                        </div>
                        <div className="stat-item">
                            <label>T4 Kills</label>
                            <span>{format(player.t4Kills)}</span>
                        </div>
                        <div className="stat-item">
                            <label>T5 Kills</label>
                            <span>{format(player.t5Kills)}</span>
                        </div>
                        <div className="stat-item">
                            <label>T1 Kills</label>
                            <span>{format(player.t1Kills)}</span>
                        </div>
                        <div className="stat-item">
                            <label>Ranged</label>
                            <span>{format(player.ranged)}</span>
                        </div>
                    </div>

                    {/* Economy & Activity */}
                    <div className="section-title"><Hammer size={18} /> Economy & Activity</div>
                    <div className="stats-grid">
                        <div className="stat-item">
                            <label>RSS Assistance</label>
                            <span>{format(player.rssAssistance)}</span>
                        </div>
                        <div className="stat-item">
                            <label>RSS Gathered</label>
                            <span>{format(player.rssGathered)}</span>
                        </div>
                        <div className="stat-item">
                            <label>Helps</label>
                            <span>{format(player.helps)}</span>
                        </div>
                        <div className="stat-item">
                            <label>City Hall</label>
                            <span>{player.cityHall}</span>
                        </div>
                    </div>

                    {/* Extra Info */}
                    {(player.notes || player.location) && (
                        <>
                            <div className="section-title"><ScrollText size={18} /> Additional Info</div>
                            <div className="info-box glass-light">
                                {player.location && (
                                    <div className="info-row">
                                        <MapPin size={16} /> <span>{player.location}</span>
                                    </div>
                                )}
                                {player.notes && (
                                    <div className="info-row">
                                        <span className="label">Notes:</span>
                                        <p>{player.notes}</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                </div>
            </div>
        </div>
    );
};

export default PlayerSidePanel;
