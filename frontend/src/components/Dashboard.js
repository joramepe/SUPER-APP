import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Trophy, Target, Calendar, TrendingUp, Medal, Zap } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = ({ players, tournaments, matches, refreshData }) => {
  const navigate = useNavigate();
  const [ranking, setRanking] = useState([]);
  const [overallStats, setOverallStats] = useState({});
  const [surfaceStats, setSurfaceStats] = useState({});
  const [davisCupStats, setDavisCupStats] = useState({});
  const [records, setRecords] = useState({});
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  useEffect(() => {
    if (players.length > 0) {
      setSelectedPlayer(players[0]);
      fetchRanking();
      fetchRecords();
    }
  }, [players]);

  useEffect(() => {
    if (selectedPlayer) {
      fetchPlayerStats(selectedPlayer.id);
    }
  }, [selectedPlayer]);

  const fetchRanking = async () => {
    try {
      const response = await axios.get(`${API}/ranking`);
      setRanking(response.data);
    } catch (error) {
      console.error('Error fetching ranking:', error);
    }
  };

  const fetchRecords = async () => {
    try {
      const response = await axios.get(`${API}/stats/records`);
      setRecords(response.data);
    } catch (error) {
      console.error('Error fetching records:', error);
    }
  };

  const fetchPlayerStats = async (playerId) => {
    try {
      const [overallRes, surfaceRes, davisRes] = await Promise.all([
        axios.get(`${API}/stats/overall/${playerId}`),
        axios.get(`${API}/stats/surface/${playerId}`),
        axios.get(`${API}/davis-cup/winner/${playerId}`)
      ]);
      
      setOverallStats(overallRes.data);
      setSurfaceStats(surfaceRes.data);
      setDavisCupStats(davisRes.data);
    } catch (error) {
      console.error('Error fetching player stats:', error);
    }
  };

  const getSurfaceColor = (surface) => {
    const colors = {
      'Hierba': 'bg-green-500',
      'Dura': 'bg-blue-500',
      'Tierra': 'bg-orange-500',
      'Dura Indoor': 'bg-purple-500'
    };
    return colors[surface] || 'bg-gray-500';
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Grand Slam': 'bg-red-500',
      'Masters 1000': 'bg-purple-500',
      'Masters 500': 'bg-cyan-500',
      'ATP Finals': 'bg-yellow-500',
      'Copa Davis': 'bg-emerald-500'
    };
    return colors[category] || 'bg-gray-500';
  };

  const StatCard = ({ title, value, subtitle, icon: Icon, color = "emerald" }) => (
    <Card className="card-hover">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className={`text-3xl font-bold text-${color}-600 mt-1`}>{value}</p>
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          </div>
          <div className={`w-12 h-12 bg-${color}-100 rounded-lg flex items-center justify-center`}>
            <Icon className={`w-6 h-6 text-${color}-600`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const StatBar = ({ label, played, won, percentage }) => (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm text-gray-500">
          {won}/{played} ({percentage}%)
        </span>
      </div>
      <div className="stat-bar-bg">
        <div 
          className="stat-bar" 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold gradient-text mb-2">ATP Tour Simulator</h1>
        <p className="text-gray-600 text-lg">Dashboard de Estadísticas y Ranking</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Torneos"
          value={tournaments.length}
          subtitle="Torneos registrados"
          icon={Calendar}
          color="emerald"
        />
        <StatCard
          title="Partidos Jugados"
          value={matches.length}
          subtitle="Partidos completados"
          icon={Target}
          color="blue"
        />
        <StatCard
          title="Jugadores"
          value={players.length}
          subtitle="Jugadores activos"
          icon={Trophy}
          color="purple"
        />
        <StatCard
          title="Puntos Líder"
          value={ranking.length > 0 ? ranking[0]?.points || 0 : 0}
          subtitle={ranking.length > 0 ? ranking[0]?.player_name : "Sin datos"}
          icon={Medal}
          color="yellow"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Ranking */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-yellow-600" />
              <span>Ranking ATP</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ranking.map((player, index) => (
                <div
                  key={player.player_id}
                  data-testid={`ranking-player-${index + 1}`}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    index === 0 
                      ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200' 
                      : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0 ? 'bg-yellow-500 text-white' : 'bg-gray-300 text-gray-700'
                    }`}>
                      {player.position}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <div className="font-medium text-gray-900">{player.player_name}</div>
                        {davisCupStats.player_id === player.player_id && davisCupStats.has_davis_cup_badge && (
                          <span className="text-lg" title="Campeón Copa Davis">🏆</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{player.points} puntos</div>
                    </div>
                  </div>
                  {index === 0 && <Medal className="w-5 h-5 text-yellow-600" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Player Statistics */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <span>Estadísticas Detalladas</span>
              </div>
              {players.length > 0 && (
                <select
                  data-testid="player-select"
                  value={selectedPlayer?.id || ''}
                  onChange={(e) => {
                    const player = players.find(p => p.id === e.target.value);
                    setSelectedPlayer(player);
                  }}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus-ring"
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
            {selectedPlayer && overallStats.matches_played !== undefined ? (
              <div className="space-y-6">
                {/* Overall Stats */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <Zap className="w-5 h-5 text-emerald-600" />
                    <span>Estadísticas Generales</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <StatBar
                      label="Partidos"
                      played={overallStats.matches_played}
                      won={overallStats.matches_won}
                      percentage={overallStats.matches_won_percentage}
                    />
                    <StatBar
                      label="Sets"
                      played={overallStats.sets_played}
                      won={overallStats.sets_won}
                      percentage={overallStats.sets_won_percentage}
                    />
                    <StatBar
                      label="Tiebreaks"
                      played={overallStats.tiebreaks_played}
                      won={overallStats.tiebreaks_won}
                      percentage={overallStats.tiebreaks_won_percentage}
                    />
                    <StatBar
                      label="Supertiebreaks"
                      played={overallStats.supertiebreaks_played}
                      won={overallStats.supertiebreaks_won}
                      percentage={overallStats.supertiebreaks_won_percentage}
                    />
                  </div>

                  {/* Duration Stats */}
                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-100">
                    <h4 className="font-medium text-gray-900 mb-3">Tiempo en Pista</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {overallStats.total_duration_hours || 0}h
                        </div>
                        <div className="text-sm text-gray-600">Total jugado</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-cyan-600">
                          {overallStats.average_match_duration_minutes || 0}min
                        </div>
                        <div className="text-sm text-gray-600">Promedio por partido</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-teal-600">
                          {overallStats.total_duration_minutes || 0}min
                        </div>
                        <div className="text-sm text-gray-600">Total en minutos</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Surface Stats */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Estadísticas por Superficie</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.entries(surfaceStats).map(([surface, stats]) => (
                      <div 
                        key={surface} 
                        className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors cursor-pointer"
                        onClick={() => navigate(`/superficie/${encodeURIComponent(surface)}`)}
                        data-testid={`surface-${surface.toLowerCase().replace(' ', '-')}`}
                      >
                        <div className="flex items-center space-x-2 mb-3">
                          <div className={`w-4 h-4 rounded-full ${getSurfaceColor(surface)}`}></div>
                          <h4 className="font-medium text-gray-900">{surface}</h4>
                          <div className="text-xs text-gray-500">👆 Click para detalles</div>
                        </div>
                        <div className="space-y-3">
                          <StatBar
                            label="Partidos"
                            played={stats.matches_played}
                            won={stats.matches_won}
                            percentage={stats.matches_won_percentage}
                          />
                          <StatBar
                            label="Sets"
                            played={stats.sets_played}
                            won={stats.sets_won}
                            percentage={stats.sets_won_percentage}
                          />
                          
                          {/* Duration info for this surface */}
                          <div className="mt-3 pt-2 border-t border-gray-200">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600">Tiempo total:</span>
                              <span className="font-medium">{stats.total_duration_hours || 0}h</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600">Promedio/partido:</span>
                              <span className="font-medium">{stats.average_match_duration_minutes || 0}min</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600">Tiempo/set:</span>
                              <span className="font-medium">{stats.average_minutes_per_set || 0}min</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Records Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">🏆 Récords y Momentos Épicos</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    
                    {/* Biggest Beatdown */}
                    {records.biggest_beatdown && (
                      <div 
                        className="bg-red-50 rounded-lg p-4 border border-red-200 cursor-pointer hover:bg-red-100 transition-colors"
                        onClick={() => {
                          const match = matches.find(m => 
                            m.tournament_id === tournaments.find(t => t.name === records.biggest_beatdown.tournament_name)?.id
                          );
                          if (match) navigate(`/partido/${match.id}`);
                        }}
                      >
                        <h4 className="font-medium text-red-800 mb-2 flex items-center">
                          💥 Mayor Paliza
                          <span className="ml-2 text-xs">👆 Click para detalles</span>
                        </h4>
                        <div className="text-sm space-y-1">
                          <div className="font-semibold">{records.biggest_beatdown.winner_name}</div>
                          <div className="text-red-700">{records.biggest_beatdown.tournament_name}</div>
                          <div>Juegos: {records.biggest_beatdown.winner_games}-{records.biggest_beatdown.loser_games}</div>
                          <div>Duración: {records.biggest_beatdown.duration_formatted}</div>
                          <div className="text-xs text-red-600">
                            Diferencia: {records.biggest_beatdown.games_differential} juegos
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Longest Match */}
                    {records.longest_match && (
                      <div 
                        className="bg-blue-50 rounded-lg p-4 border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors"
                        onClick={() => {
                          const match = matches.find(m => 
                            m.tournament_id === tournaments.find(t => t.name === records.longest_match.tournament_name)?.id
                          );
                          if (match) navigate(`/partido/${match.id}`);
                        }}
                      >
                        <h4 className="font-medium text-blue-800 mb-2 flex items-center">
                          ⏰ Partido Más Largo
                          <span className="ml-2 text-xs">👆 Click para detalles</span>
                        </h4>
                        <div className="text-sm space-y-1">
                          <div className="font-semibold">{records.longest_match.winner_name} venció</div>
                          <div className="text-blue-700">{records.longest_match.tournament_name}</div>
                          <div>Duración: {records.longest_match.duration_formatted}</div>
                          <div>Sets: {records.longest_match.sets?.length || 0}</div>
                        </div>
                      </div>
                    )}

                    {/* Most Epic */}
                    {records.most_epic && (
                      <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                        <h4 className="font-medium text-purple-800 mb-2 flex items-center">
                          🔥 Partido Más Épico
                        </h4>
                        <div className="text-sm space-y-1">
                          <div className="font-semibold">{records.most_epic.winner_name} venció</div>
                          <div className="text-purple-700">{records.most_epic.tournament_name}</div>
                          <div>Duración: {records.most_epic.duration_formatted}</div>
                          <div>Sets: {records.most_epic.sets?.length || 0}</div>
                        </div>
                      </div>
                    )}

                    {/* Most Tiebreaks */}
                    {records.most_tiebreaks && (
                      <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                        <h4 className="font-medium text-orange-800 mb-2 flex items-center">
                          🎾 Más Tiebreaks
                        </h4>
                        <div className="text-sm space-y-1">
                          <div className="font-semibold">{records.most_tiebreaks.winner_name} venció</div>
                          <div className="text-orange-700">{records.most_tiebreaks.tournament_name}</div>
                          <div>Tiebreaks: {records.most_tiebreaks.tiebreaks}</div>
                          <div>Supertiebreaks: {records.most_tiebreaks.supertiebreaks}</div>
                        </div>
                      </div>
                    )}

                  </div>

                  {/* Favorite Surfaces */}
                  {records.favorite_surfaces && Object.keys(records.favorite_surfaces).length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-medium text-gray-900 mb-3">🏟️ Superficies Favoritas</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(records.favorite_surfaces).map(([playerName, surfaceInfo]) => (
                          <div key={playerName} className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-emerald-800">{playerName}</span>
                              <div className="text-right">
                                <div className="font-semibold text-emerald-700">{surfaceInfo.surface}</div>
                                <div className="text-sm text-emerald-600">
                                  {surfaceInfo.wins}/{surfaceInfo.total} ({surfaceInfo.percentage}%)
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  {players.length === 0 
                    ? "No hay jugadores registrados" 
                    : "Selecciona un jugador para ver las estadísticas"
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Tournaments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span>Torneos Recientes</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tournaments.slice(-6).reverse().map((tournament) => {
              const tournamentMatches = matches.filter(m => m.tournament_id === tournament.id);
              
              return (
                <div
                  key={tournament.id}
                  data-testid={`tournament-card-${tournament.id}`}
                  className="bg-gradient-to-br from-white to-gray-50 rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    if (tournamentMatches.length > 0) {
                      navigate(`/partido/${tournamentMatches[0].id}`);
                    }
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 truncate">{tournament.name}</h3>
                      <p className="text-sm text-gray-500">{tournament.real_location}</p>
                      {tournamentMatches.length > 0 && (
                        <div className="text-xs text-emerald-600 mt-1">👆 Click para ver resultado</div>
                      )}
                    </div>
                    <Badge className={`${getCategoryColor(tournament.category)} text-white text-xs`}>
                      {tournament.points}p
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${getSurfaceColor(tournament.surface)}`}></div>
                      <span className="text-sm text-gray-600">{tournament.surface}</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(tournament.tournament_date).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                  
                  {/* Show match result preview if exists */}
                  {tournamentMatches.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="text-xs text-gray-600">
                        Ganador: {getPlayerName(tournamentMatches[0].winner_id)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;