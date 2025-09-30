import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ArrowLeft, Trophy, Target, User, TrendingUp } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SurfaceDetail = ({ players, tournaments, matches }) => {
  const { surface } = useParams();
  const navigate = useNavigate();
  const [surfaceMatches, setSurfaceMatches] = useState([]);
  const [surfaceStats, setSurfaceStats] = useState({});
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  useEffect(() => {
    if (players.length > 0) {
      setSelectedPlayer(players[0]);
      loadSurfaceData();
    }
  }, [surface, players, tournaments, matches]);

  const loadSurfaceData = () => {
    // Filter tournaments by surface
    const surfaceTournaments = tournaments.filter(t => t.surface === surface);
    const tournamentIds = surfaceTournaments.map(t => t.id);
    
    // Filter matches by surface tournaments
    const filtered = matches.filter(m => tournamentIds.includes(m.tournament_id));
    setSurfaceMatches(filtered);
  };

  useEffect(() => {
    if (selectedPlayer) {
      fetchSurfaceStats(selectedPlayer.id);
    }
  }, [selectedPlayer, surface]);

  const fetchSurfaceStats = async (playerId) => {
    try {
      const response = await axios.get(`${API}/stats/surface/${playerId}`);
      setSurfaceStats(response.data[surface] || {});
    } catch (error) {
      console.error('Error fetching surface stats:', error);
    }
  };

  const getSurfaceColor = (surfaceName) => {
    const colors = {
      'Hierba': 'from-green-500 to-green-600',
      'Dura': 'from-blue-500 to-blue-600',
      'Tierra': 'from-orange-500 to-orange-600',
      'Dura Indoor': 'from-purple-500 to-purple-600'
    };
    return colors[surfaceName] || 'from-gray-500 to-gray-600';
  };

  const getSurfaceIcon = (surfaceName) => {
    const icons = {
      'Hierba': '🌱',
      'Dura': '🏟️',
      'Tierra': '🟫', 
      'Dura Indoor': '🏢'
    };
    return icons[surfaceName] || '🎾';
  };

  const getPlayerName = (playerId) => {
    const player = players.find(p => p.id === playerId);
    return player?.name || 'Desconocido';
  };

  const getTournamentName = (tournamentId) => {
    const tournament = tournaments.find(t => t.id === tournamentId);
    return tournament?.name || 'Desconocido';
  };

  const formatMatchScore = (sets) => {
    if (!sets || sets.length === 0) return 'Sin sets';
    
    return sets.map(set => {
      const p1Games = set.player1_games || 0;
      const p2Games = set.player2_games || 0;
      let scoreStr = `${p1Games}-${p2Games}`;
      
      if (set.tiebreak_p1 !== null && set.tiebreak_p2 !== null) {
        const winner_tb = set.tiebreak_p1 > set.tiebreak_p2 ? set.tiebreak_p1 : set.tiebreak_p2;
        scoreStr += `(${winner_tb})`;
      }
      
      if (set.supertiebreak_p1 !== null && set.supertiebreak_p2 !== null) {
        const winner_stb = set.supertiebreak_p1 > set.supertiebreak_p2 ? set.supertiebreak_p1 : set.supertiebreak_p2;
        scoreStr += `[${winner_stb}]`;
      }
      
      return scoreStr;
    }).join(', ');
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button
          onClick={() => navigate('/')}
          variant="outline"
          className="hover:bg-gray-50"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al Dashboard
        </Button>
        
        <div className={`bg-gradient-to-r ${getSurfaceColor(surface)} text-white px-6 py-3 rounded-lg flex items-center space-x-3`}>
          <span className="text-2xl">{getSurfaceIcon(surface)}</span>
          <div>
            <h1 className="text-2xl font-bold">Estadísticas en {surface}</h1>
            <p className="text-white/80">Análisis detallado de superficie</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Surface Statistics */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <span>Estadísticas en {surface}</span>
              </div>
              {players.length > 0 && (
                <select
                  value={selectedPlayer?.id || ''}
                  onChange={(e) => {
                    const player = players.find(p => p.id === e.target.value);
                    setSelectedPlayer(player);
                  }}
                  className="px-2 py-1 border border-gray-300 rounded text-sm focus-ring"
                >
                  {players.map(player => (
                    <option key={player.id} value={player.id}>
                      {player.name}
                    </option>
                  ))}
                </select>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {surfaceStats.matches_played !== undefined ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-emerald-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-emerald-600">
                      {surfaceStats.matches_won}/{surfaceStats.matches_played}
                    </div>
                    <div className="text-sm text-gray-600">Partidos</div>
                    <div className="text-xs text-emerald-600 font-medium">
                      {surfaceStats.matches_won_percentage}%
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {surfaceStats.sets_won}/{surfaceStats.sets_played}
                    </div>
                    <div className="text-sm text-gray-600">Sets</div>
                    <div className="text-xs text-blue-600 font-medium">
                      {surfaceStats.sets_won_percentage}%
                    </div>
                  </div>
                </div>

                {/* Duration Stats */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Tiempo en Pista</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total:</span>
                      <span className="font-medium">{surfaceStats.total_duration_hours || 0}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Promedio/partido:</span>
                      <span className="font-medium">{surfaceStats.average_match_duration_minutes || 0}min</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Tiempo/set:</span>
                      <span className="font-medium">{surfaceStats.average_minutes_per_set || 0}min</span>
                    </div>
                  </div>
                </div>

                {/* Tiebreak Stats */}
                <div className="bg-orange-50 rounded-lg p-4">
                  <h4 className="font-medium text-orange-800 mb-3">Tiebreaks y Supertiebreaks</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Tiebreaks:</span>
                      <span className="font-medium">
                        {surfaceStats.tiebreaks_won}/{surfaceStats.tiebreaks_played} 
                        ({surfaceStats.tiebreaks_won_percentage}%)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Supertiebreaks:</span>
                      <span className="font-medium">
                        {surfaceStats.supertiebreaks_won}/{surfaceStats.supertiebreaks_played} 
                        ({surfaceStats.supertiebreaks_won_percentage}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No hay estadísticas para esta superficie</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Matches in this Surface */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-emerald-600" />
              <span>Partidos en {surface}</span>
              <span className="text-sm font-normal text-gray-500">({surfaceMatches.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {surfaceMatches.length === 0 ? (
              <div className="text-center py-12">
                <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No hay partidos registrados en {surface}
                </h3>
                <p className="text-gray-500">Los partidos aparecerán aquí cuando se registren</p>
              </div>
            ) : (
              <div className="space-y-4">
                {surfaceMatches.slice().reverse().map((match, index) => (
                  <div
                    key={match.id}
                    data-testid={`surface-match-${index}`}
                    className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/partido/${match.id}`)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {getTournamentName(match.tournament_id)}
                        </h3>
                        <div className="text-sm text-gray-500 mb-2">
                          {match.duration_minutes && (
                            <span>Duración: {Math.floor(match.duration_minutes / 60)}h {match.duration_minutes % 60}min</span>
                          )}
                        </div>
                        
                        {/* Players and Score */}
                        <div className="space-y-1">
                          <div className={`flex items-center space-x-2 ${match.winner_id === match.player1_id ? 'font-semibold text-emerald-700' : 'text-gray-700'}`}>
                            <User className="w-4 h-4" />
                            <span>{getPlayerName(match.player1_id)}</span>
                            {match.winner_id === match.player1_id && <Trophy className="w-4 h-4 text-yellow-600" />}
                          </div>
                          <div className={`flex items-center space-x-2 ml-6 ${match.winner_id === match.player2_id ? 'font-semibold text-emerald-700' : 'text-gray-700'}`}>
                            <User className="w-4 h-4" />
                            <span>{getPlayerName(match.player2_id)}</span>
                            {match.winner_id === match.player2_id && <Trophy className="w-4 h-4 text-yellow-600" />}
                          </div>
                        </div>
                        
                        <div className="mt-2">
                          <div className="text-sm text-gray-600">
                            <strong>Resultado:</strong> {formatMatchScore(match.sets)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SurfaceDetail;