import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Badge } from './ui/badge';
import { Target, Plus, Calendar, User, Trophy, Edit, Trash2, Minus, X } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MatchManager = ({ matches, tournaments, players, refreshData }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState(null);
  const [formData, setFormData] = useState({
    tournament_id: '',
    player1_id: '',
    player2_id: '',
    winner_id: '',
    sets: []
  });
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setEditingMatch(null);
    setFormData({
      tournament_id: '',
      player1_id: '',
      player2_id: '',
      winner_id: '',
      sets: []
    });
  };

  const initializeSets = (tournamentId) => {
    const tournament = tournaments.find(t => t.id === tournamentId);
    if (!tournament) return [];
    
    // Initialize with minimum sets needed
    const maxSets = tournament.is_best_of_five ? 5 : 3;
    const minSetsToWin = Math.ceil(maxSets / 2);
    
    return Array.from({ length: minSetsToWin }, () => ({
      player1_games: 0,
      player2_games: 0,
      tiebreak_p1: null,
      tiebreak_p2: null,
      supertiebreak_p1: null,
      supertiebreak_p2: null
    }));
  };

  const handleTournamentChange = (tournamentId) => {
    const newSets = initializeSets(tournamentId);
    setFormData({
      ...formData,
      tournament_id: tournamentId,
      sets: newSets
    });
  };

  const addSet = () => {
    const tournament = tournaments.find(t => t.id === formData.tournament_id);
    if (!tournament) return;
    
    const maxSets = tournament.is_best_of_five ? 5 : 3;
    if (formData.sets.length >= maxSets) return;

    setFormData({
      ...formData,
      sets: [...formData.sets, {
        player1_games: 0,
        player2_games: 0,
        tiebreak_p1: null,
        tiebreak_p2: null,
        supertiebreak_p1: null,
        supertiebreak_p2: null
      }]
    });
  };

  const removeSet = (index) => {
    if (formData.sets.length <= 1) return; // Keep at least one set
    
    const newSets = formData.sets.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      sets: newSets
    });
  };

  const updateSet = (index, field, value) => {
    const newSets = [...formData.sets];
    newSets[index] = {
      ...newSets[index],
      [field]: value === '' ? null : parseInt(value, 10)
    };
    setFormData({
      ...formData,
      sets: newSets
    });
  };

  const isDecisiveSet = (setIndex) => {
    const tournament = tournaments.find(t => t.id === formData.tournament_id);
    if (!tournament) return false;
    
    // Para Grand Slam (mejor de 5): set decisivo es el 5to (índice 4)
    if (tournament.is_best_of_five) {
      return setIndex === 4; // 5to set
    } else {
      // Para el resto (mejor de 3): set decisivo es el 3ro (índice 2)
      return setIndex === 2; // 3er set
    }
  };

  const validateMatch = () => {
    if (!formData.tournament_id || !formData.player1_id || !formData.player2_id || 
        !formData.winner_id) {
      toast.error('Todos los campos básicos son obligatorios');
      return false;
    }

    if (formData.player1_id === formData.player2_id) {
      toast.error('Los jugadores deben ser diferentes');
      return false;
    }

    if (formData.winner_id !== formData.player1_id && formData.winner_id !== formData.player2_id) {
      toast.error('El ganador debe ser uno de los dos jugadores');
      return false;
    }

    if (formData.sets.length === 0) {
      toast.error('Debe agregar al menos un set');
      return false;
    }

    // Validate sets
    for (let i = 0; i < formData.sets.length; i++) {
      const set = formData.sets[i];
      if (set.player1_games < 0 || set.player2_games < 0) {
        toast.error(`Set ${i + 1}: Los juegos no pueden ser negativos`);
        return false;
      }
      
      if (set.player1_games === set.player2_games) {
        toast.error(`Set ${i + 1}: Los juegos no pueden quedar empatados`);
        return false;
      }

      // Check tiebreak logic
      if ((set.player1_games === 7 && set.player2_games === 6) || 
          (set.player1_games === 6 && set.player2_games === 7)) {
        if (set.tiebreak_p1 === null || set.tiebreak_p2 === null) {
          toast.error(`Set ${i + 1}: Se requiere tiebreak cuando el resultado es 7-6`);
          return false;
        }
      }
    }

    return true;
  };

  const calculateWinner = () => {
    if (formData.sets.length === 0) return null;
    
    let player1Sets = 0;
    let player2Sets = 0;
    
    formData.sets.forEach(set => {
      if (set.player1_games > set.player2_games) {
        player1Sets++;
      } else {
        player2Sets++;
      }
    });

    const tournament = tournaments.find(t => t.id === formData.tournament_id);
    const setsToWin = tournament?.is_best_of_five ? 3 : 2;
    
    if (player1Sets >= setsToWin) {
      return formData.player1_id;
    } else if (player2Sets >= setsToWin) {
      return formData.player2_id;
    }
    
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateMatch()) return;

    // Auto-calculate winner if not set
    const calculatedWinner = calculateWinner();
    if (calculatedWinner) {
      setFormData(prev => ({ ...prev, winner_id: calculatedWinner }));
    }

    setLoading(true);
    try {
      const submitData = { ...formData };
      if (calculatedWinner) {
        submitData.winner_id = calculatedWinner;
      }

      if (editingMatch) {
        await axios.put(`${API}/matches/${editingMatch.id}`, submitData);
        toast.success('Partido actualizado correctamente');
      } else {
        await axios.post(`${API}/matches`, submitData);
        toast.success('Partido registrado correctamente');
      }
      
      setIsDialogOpen(false);
      resetForm();
      refreshData();
    } catch (error) {
      console.error('Error saving match:', error);
      toast.error(editingMatch ? 'Error al actualizar partido' : 'Error al registrar partido');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (match) => {
    setEditingMatch(match);
    setFormData({
      tournament_id: match.tournament_id,
      player1_id: match.player1_id,
      player2_id: match.player2_id,
      winner_id: match.winner_id,
      sets: match.sets || []
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (matchId) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este partido?')) {
      return;
    }

    try {
      await axios.delete(`${API}/matches/${matchId}`);
      toast.success('Partido eliminado correctamente');
      refreshData();
    } catch (error) {
      console.error('Error deleting match:', error);
      toast.error('Error al eliminar partido');
    }
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

  const getPlayerName = (playerId) => {
    const player = players.find(p => p.id === playerId);
    return player?.name || 'Desconocido';
  };

  const getTournamentName = (tournamentId) => {
    const tournament = tournaments.find(t => t.id === tournamentId);
    return tournament?.name || 'Desconocido';
  };

  const getSurfaceColor = (tournamentId) => {
    const tournament = tournaments.find(t => t.id === tournamentId);
    const surfaces = {
      'Hierba': 'bg-green-500',
      'Dura': 'bg-blue-500',
      'Tierra': 'bg-orange-500',
      'Dura Indoor': 'bg-purple-500'
    };
    return surfaces[tournament?.surface] || 'bg-gray-500';
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Gestión de Partidos</h1>
          <p className="text-gray-600 mt-1">Registra y edita los resultados de los partidos</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button 
              className="btn-hover bg-emerald-600 hover:bg-emerald-700" 
              data-testid="add-match-button"
              disabled={tournaments.length === 0 || players.length < 2}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Partido
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingMatch ? 'Editar Partido' : 'Nuevo Partido'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="tournament">Torneo</Label>
                  <Select
                    value={formData.tournament_id}
                    onValueChange={handleTournamentChange}
                  >
                    <SelectTrigger data-testid="tournament-select">
                      <SelectValue placeholder="Selecciona torneo" />
                    </SelectTrigger>
                    <SelectContent>
                      {tournaments.map((tournament) => (
                        <SelectItem key={tournament.id} value={tournament.id}>
                          {tournament.name} ({tournament.category})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="player1">Jugador 1</Label>
                  <Select
                    value={formData.player1_id}
                    onValueChange={(value) => setFormData({ ...formData, player1_id: value })}
                  >
                    <SelectTrigger data-testid="player1-select">
                      <SelectValue placeholder="Selecciona jugador 1" />
                    </SelectTrigger>
                    <SelectContent>
                      {players.map((player) => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="player2">Jugador 2</Label>
                  <Select
                    value={formData.player2_id}
                    onValueChange={(value) => setFormData({ ...formData, player2_id: value })}
                  >
                    <SelectTrigger data-testid="player2-select">
                      <SelectValue placeholder="Selecciona jugador 2" />
                    </SelectTrigger>
                    <SelectContent>
                      {players.filter(p => p.id !== formData.player1_id).map((player) => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Sets Section */}
              {formData.tournament_id && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Resultado por Sets</h3>
                    <Button
                      type="button"
                      onClick={addSet}
                      variant="outline"
                      size="sm"
                      data-testid="add-set-button"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar Set
                    </Button>
                  </div>

                  {formData.sets.map((set, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-gray-900">Set {index + 1}</h4>
                        {formData.sets.length > 1 && (
                          <Button
                            type="button"
                            onClick={() => removeSet(index)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            data-testid={`remove-set-${index}`}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Games */}
                        <div>
                          <Label htmlFor={`set${index}P1Games`}>Juegos J1</Label>
                          <Input
                            id={`set${index}P1Games`}
                            data-testid={`set-${index}-p1-games`}
                            type="number"
                            min="0"
                            max="7"
                            value={set.player1_games || ''}
                            onChange={(e) => updateSet(index, 'player1_games', e.target.value)}
                            className="focus-ring"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`set${index}P2Games`}>Juegos J2</Label>
                          <Input
                            id={`set${index}P2Games`}
                            data-testid={`set-${index}-p2-games`}
                            type="number"
                            min="0"
                            max="7"
                            value={set.player2_games || ''}
                            onChange={(e) => updateSet(index, 'player2_games', e.target.value)}
                            className="focus-ring"
                          />
                        </div>

                        {/* Tiebreak o Supertiebreak según corresponda */}
                        {isDecisiveSet(index) ? (
                          // Supertiebreak para set decisivo
                          <>
                            <div>
                              <Label htmlFor={`set${index}P1STB`}>SuperTB J1</Label>
                              <Input
                                id={`set${index}P1STB`}
                                data-testid={`set-${index}-p1-supertiebreak`}
                                type="number"
                                min="0"
                                value={set.supertiebreak_p1 || ''}
                                onChange={(e) => updateSet(index, 'supertiebreak_p1', e.target.value)}
                                className="focus-ring"
                                placeholder="10"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`set${index}P2STB`}>SuperTB J2</Label>
                              <Input
                                id={`set${index}P2STB`}
                                data-testid={`set-${index}-p2-supertiebreak`}
                                type="number"
                                min="0"
                                value={set.supertiebreak_p2 || ''}
                                onChange={(e) => updateSet(index, 'supertiebreak_p2', e.target.value)}
                                className="focus-ring"
                                placeholder="8"
                              />
                            </div>
                          </>
                        ) : (
                          // Tiebreak normal para sets normales
                          <>
                            <div>
                              <Label htmlFor={`set${index}P1TB`}>Tiebreak J1</Label>
                              <Input
                                id={`set${index}P1TB`}
                                data-testid={`set-${index}-p1-tiebreak`}
                                type="number"
                                min="0"
                                value={set.tiebreak_p1 || ''}
                                onChange={(e) => updateSet(index, 'tiebreak_p1', e.target.value)}
                                className="focus-ring"
                                placeholder="7"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`set${index}P2TB`}>Tiebreak J2</Label>
                              <Input
                                id={`set${index}P2TB`}
                                data-testid={`set-${index}-p2-tiebreak`}
                                type="number"
                                min="0"
                                value={set.tiebreak_p2 || ''}
                                onChange={(e) => updateSet(index, 'tiebreak_p2', e.target.value)}
                                className="focus-ring"
                                placeholder="5"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  data-testid="save-match-button"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  disabled={loading}
                >
                  {loading ? 'Guardando...' : (editingMatch ? 'Actualizar' : 'Registrar Partido')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="w-5 h-5 text-emerald-600" />
            <span>Partidos Registrados</span>
            <span className="text-sm font-normal text-gray-500">({matches.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {matches.length === 0 ? (
            <div className="text-center py-12">
              <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay partidos registrados</h3>
              <p className="text-gray-500 mb-4">
                {tournaments.length === 0 ? 'Primero crea un torneo' : 
                 players.length < 2 ? 'Necesitas al menos 2 jugadores' : 
                 'Comienza registrando tu primer partido'}
              </p>
              {tournaments.length > 0 && players.length >= 2 && (
                <Button
                  onClick={() => setIsDialogOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700"
                  data-testid="create-first-match-button"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Registrar Primer Partido
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {matches.slice().reverse().map((match, index) => (
                <div
                  key={match.id}
                  data-testid={`match-card-${index}`}
                  className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-lg p-6 card-hover"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold text-gray-900">{getTournamentName(match.tournament_id)}</h3>
                        <div className={`w-3 h-3 rounded-full ${getSurfaceColor(match.tournament_id)}`}></div>
                      </div>
                      <div className="text-sm text-gray-500 mb-3">
                        Registrado: {new Date(match.created_at).toLocaleDateString('es-ES')}
                      </div>
                      
                      {/* Players and Score */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-4">
                          <div className={`flex items-center space-x-2 ${match.winner_id === match.player1_id ? 'font-semibold text-emerald-700' : 'text-gray-700'}`}>
                            <User className="w-4 h-4" />
                            <span>{getPlayerName(match.player1_id)}</span>
                            {match.winner_id === match.player1_id && <Trophy className="w-4 h-4 text-yellow-600" />}
                          </div>
                        </div>
                        <div className={`flex items-center space-x-2 ml-6 ${match.winner_id === match.player2_id ? 'font-semibold text-emerald-700' : 'text-gray-700'}`}>
                          <User className="w-4 h-4" />
                          <span>{getPlayerName(match.player2_id)}</span>
                          {match.winner_id === match.player2_id && <Trophy className="w-4 h-4 text-yellow-600" />}
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <div className="text-sm text-gray-600">
                          <strong>Resultado:</strong> {formatMatchScore(match.sets)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(match)}
                      data-testid={`edit-match-${index}`}
                      className="flex-1 hover:bg-blue-50 hover:border-blue-300"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(match.id)}
                      data-testid={`delete-match-${index}`}
                      className="flex-1 hover:bg-red-50 hover:border-red-300 text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Eliminar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MatchManager;