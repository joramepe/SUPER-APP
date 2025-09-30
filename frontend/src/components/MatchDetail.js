import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ArrowLeft, Trophy, User, Calendar, MapPin, Clock, Target, Zap } from 'lucide-react';

const MatchDetail = ({ players, tournaments, matches }) => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [tournament, setTournament] = useState(null);
  const [player1, setPlayer1] = useState(null);
  const [player2, setPlayer2] = useState(null);

  useEffect(() => {
    loadMatchData();
  }, [matchId, matches, tournaments, players]);

  const loadMatchData = () => {
    const foundMatch = matches.find(m => m.id === matchId);
    if (foundMatch) {
      setMatch(foundMatch);
      
      const foundTournament = tournaments.find(t => t.id === foundMatch.tournament_id);
      setTournament(foundTournament);
      
      const foundPlayer1 = players.find(p => p.id === foundMatch.player1_id);
      const foundPlayer2 = players.find(p => p.id === foundMatch.player2_id);
      setPlayer1(foundPlayer1);
      setPlayer2(foundPlayer2);
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

  const formatSetScore = (set, setIndex) => {
    const p1Games = set.player1_games || 0;
    const p2Games = set.player2_games || 0;
    
    let scoreDisplay = (
      <div className="text-center">
        <div className="text-lg font-bold">
          {p1Games} - {p2Games}
        </div>
        {set.tiebreak_p1 !== null && set.tiebreak_p2 !== null && (
          <div className="text-sm text-blue-600">
            TB: {set.tiebreak_p1}-{set.tiebreak_p2}
          </div>
        )}
        {set.supertiebreak_p1 !== null && set.supertiebreak_p2 !== null && (
          <div className="text-sm text-purple-600">
            STB: {set.supertiebreak_p1}-{set.supertiebreak_p2}
          </div>
        )}
      </div>
    );

    // Determine set winner
    let setWinner = null;
    if (p1Games > p2Games) {
      setWinner = match.player1_id;
    } else if (p2Games > p1Games) {
      setWinner = match.player2_id;
    }

    const isDecisive = setIndex === match.sets.length - 1;

    return (
      <div className={`p-4 rounded-lg border-2 ${
        setWinner === match.winner_id 
          ? 'border-emerald-300 bg-emerald-50' 
          : 'border-red-300 bg-red-50'
      } ${isDecisive ? 'ring-2 ring-yellow-300' : ''}`}>
        <div className="text-xs text-gray-500 mb-1">
          Set {setIndex + 1} {isDecisive && '(Decisivo)'}
        </div>
        {scoreDisplay}
        <div className="text-xs text-gray-600 mt-1">
          Ganador: {setWinner === match.player1_id ? player1?.name : player2?.name}
        </div>
      </div>
    );
  };

  const calculateMatchStats = () => {
    if (!match || !match.sets) return {};

    let p1Games = 0, p2Games = 0;
    let p1Sets = 0, p2Sets = 0;
    let totalTiebreaks = 0;
    let p1Tiebreaks = 0;
    let totalSupertiebreaks = 0;
    let p1Supertiebreaks = 0;

    match.sets.forEach(set => {
      p1Games += set.player1_games || 0;
      p2Games += set.player2_games || 0;

      // Set winner
      if ((set.player1_games || 0) > (set.player2_games || 0)) {
        p1Sets++;
      } else {
        p2Sets++;
      }

      // Tiebreaks
      if (set.tiebreak_p1 !== null && set.tiebreak_p2 !== null) {
        totalTiebreaks++;
        if ((set.tiebreak_p1 || 0) > (set.tiebreak_p2 || 0)) {
          p1Tiebreaks++;
        }
      }

      // Supertiebreaks
      if (set.supertiebreak_p1 !== null && set.supertiebreak_p2 !== null) {
        totalSupertiebreaks++;
        if ((set.supertiebreak_p1 || 0) > (set.supertiebreak_p2 || 0)) {
          p1Supertiebreaks++;
        }
      }
    });

    return {
      p1Games, p2Games, p1Sets, p2Sets,
      totalTiebreaks, p1Tiebreaks, 
      totalSupertiebreaks, p1Supertiebreaks,
      gamesDifferential: Math.abs(p1Games - p2Games)
    };
  };

  if (!match || !tournament || !player1 || !player2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl text-emerald-800 mb-4">Cargando partido...</div>
          <Button onClick={() => navigate('/')} variant="outline">
            Volver al Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const stats = calculateMatchStats();
  const isPlayer1Winner = match.winner_id === match.player1_id;

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
      </div>

      {/* Tournament Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Trophy className="w-8 h-8 text-emerald-600" />
              <div>
                <CardTitle className="text-2xl">{tournament.name}</CardTitle>
                <p className="text-gray-600">{tournament.real_location}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={`${getCategoryColor(tournament.category)} text-white`}>
                {tournament.category}
              </Badge>
              <Badge className={`${getSurfaceColor(tournament.surface)} text-white`}>
                {tournament.surface}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>{new Date(tournament.tournament_date).toLocaleDateString('es-ES')}</span>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4" />
              <span>{tournament.fictional_location}</span>
            </div>
            {match.duration_minutes && (
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>{Math.floor(match.duration_minutes / 60)}h {match.duration_minutes % 60}min</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Match Result */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-emerald-600" />
              <span>Resultado del Partido</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Players */}
            <div className="space-y-4 mb-6">
              <div className={`flex items-center justify-between p-4 rounded-lg ${
                isPlayer1Winner ? 'bg-emerald-50 border-2 border-emerald-300' : 'bg-gray-50'
              }`}>
                <div className="flex items-center space-x-3">
                  <User className="w-6 h-6 text-gray-600" />
                  <span className={`text-lg ${isPlayer1Winner ? 'font-bold text-emerald-800' : 'text-gray-700'}`}>
                    {player1.name}
                  </span>
                  {isPlayer1Winner && <Trophy className="w-5 h-5 text-yellow-600" />}
                </div>
                <div className={`text-xl font-bold ${isPlayer1Winner ? 'text-emerald-700' : 'text-gray-600'}`}>
                  {stats.p1Sets}
                </div>
              </div>

              <div className={`flex items-center justify-between p-4 rounded-lg ${
                !isPlayer1Winner ? 'bg-emerald-50 border-2 border-emerald-300' : 'bg-gray-50'
              }`}>
                <div className="flex items-center space-x-3">
                  <User className="w-6 h-6 text-gray-600" />
                  <span className={`text-lg ${!isPlayer1Winner ? 'font-bold text-emerald-800' : 'text-gray-700'}`}>
                    {player2.name}
                  </span>
                  {!isPlayer1Winner && <Trophy className="w-5 h-5 text-yellow-600" />}
                </div>
                <div className={`text-xl font-bold ${!isPlayer1Winner ? 'text-emerald-700' : 'text-gray-600'}`}>
                  {stats.p2Sets}
                </div>
              </div>
            </div>

            {/* Sets Breakdown */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Resultado por Sets</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {match.sets.map((set, index) => (
                  <div key={index}>
                    {formatSetScore(set, index)}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Match Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-emerald-600" />
              <span>Estadísticas del Partido</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Games */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">Juegos Totales</h4>
                <div className="flex justify-between items-center">
                  <span className="text-sm">{player1.name}</span>
                  <span className="font-bold text-blue-700">{stats.p1Games}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">{player2.name}</span>
                  <span className="font-bold text-blue-700">{stats.p2Games}</span>
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  Diferencia: {stats.gamesDifferential} juegos
                </div>
              </div>

              {/* Duration & Intensity */}
              {match.duration_minutes && (
                <div className="bg-orange-50 rounded-lg p-4">
                  <h4 className="font-medium text-orange-800 mb-2">Intensidad</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Duración total:</span>
                      <span className="font-medium">{Math.floor(match.duration_minutes / 60)}h {match.duration_minutes % 60}min</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tiempo por set:</span>
                      <span className="font-medium">{Math.round(match.duration_minutes / match.sets.length)}min</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sets jugados:</span>
                      <span className="font-medium">{match.sets.length}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tiebreaks */}
              {(stats.totalTiebreaks > 0 || stats.totalSupertiebreaks > 0) && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <h4 className="font-medium text-purple-800 mb-2">Desempates</h4>
                  {stats.totalTiebreaks > 0 && (
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm">Tiebreaks:</span>
                      <span className="font-medium text-purple-700">
                        {stats.p1Tiebreaks}/{stats.totalTiebreaks} para {player1.name}
                      </span>
                    </div>
                  )}
                  {stats.totalSupertiebreaks > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Supertiebreaks:</span>
                      <span className="font-medium text-purple-700">
                        {stats.p1Supertiebreaks}/{stats.totalSupertiebreaks} para {player1.name}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Tournament Points */}
              <div className="bg-emerald-50 rounded-lg p-4">
                <h4 className="font-medium text-emerald-800 mb-2">Puntos ATP</h4>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Ganador:</span>
                  <span className="font-bold text-emerald-700">+{tournament.points} puntos</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Perdedor:</span>
                  <span className="text-gray-600">0 puntos</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MatchDetail;