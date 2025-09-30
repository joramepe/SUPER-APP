import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Calendar, Plus, MapPin, Edit, Trash2, Trophy } from 'lucide-react';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TOURNAMENT_CATEGORIES = [
  { value: 'Grand Slam', label: 'Grand Slam', points: 2000, color: 'bg-red-500' },
  { value: 'Masters 1000', label: 'Masters 1000', points: 1000, color: 'bg-purple-500' },
  { value: 'Masters 500', label: 'Masters 500', points: 500, color: 'bg-cyan-500' },
  { value: 'ATP Finals', label: 'ATP Finals', points: 1500, color: 'bg-yellow-500' },
  { value: 'Copa Davis', label: 'Copa Davis', points: 0, color: 'bg-emerald-500' }
];

const SURFACES = [
  { value: 'Hierba', label: 'Hierba', color: 'bg-green-500' },
  { value: 'Dura', label: 'Dura', color: 'bg-blue-500' },
  { value: 'Tierra', label: 'Tierra', color: 'bg-orange-500' },
  { value: 'Dura Indoor', label: 'Dura Indoor', color: 'bg-purple-500' }
];

const TournamentManager = ({ tournaments, refreshData }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTournament, setEditingTournament] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    surface: '',
    real_location: '',
    fictional_location: '',
    tournament_date: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.category || !formData.surface || 
        !formData.real_location.trim() || !formData.fictional_location.trim() || 
        !formData.tournament_date) {
      toast.error('Todos los campos son obligatorios');
      return;
    }

    setLoading(true);
    try {
      if (editingTournament) {
        await axios.put(`${API}/tournaments/${editingTournament.id}`, formData);
        toast.success('Torneo actualizado correctamente');
      } else {
        await axios.post(`${API}/tournaments`, formData);
        toast.success('Torneo creado correctamente');
      }
      
      setIsDialogOpen(false);
      setEditingTournament(null);
      resetForm();
      refreshData();
    } catch (error) {
      console.error('Error saving tournament:', error);
      toast.error(editingTournament ? 'Error al actualizar torneo' : 'Error al crear torneo');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (tournament) => {
    setEditingTournament(tournament);
    setFormData({
      name: tournament.name,
      category: tournament.category,
      surface: tournament.surface,
      real_location: tournament.real_location,
      fictional_location: tournament.fictional_location,
      tournament_date: tournament.tournament_date
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (tournamentId) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este torneo?')) {
      return;
    }

    try {
      await axios.delete(`${API}/tournaments/${tournamentId}`);
      toast.success('Torneo eliminado correctamente');
      refreshData();
    } catch (error) {
      console.error('Error deleting tournament:', error);
      toast.error('Error al eliminar torneo');
    }
  };

  const resetForm = () => {
    setEditingTournament(null);
    setFormData({
      name: '',
      category: '',
      surface: '',
      real_location: '',
      fictional_location: '',
      tournament_date: ''
    });
  };

  const getCategoryInfo = (category) => {
    return TOURNAMENT_CATEGORIES.find(cat => cat.value === category) || TOURNAMENT_CATEGORIES[0];
  };

  const getSurfaceInfo = (surface) => {
    return SURFACES.find(surf => surf.value === surface) || SURFACES[0];
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Gestión de Torneos</h1>
          <p className="text-gray-600 mt-1">Administra los torneos del circuito ATP</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="btn-hover bg-emerald-600 hover:bg-emerald-700" data-testid="add-tournament-button">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Torneo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingTournament ? 'Editar Torneo' : 'Nuevo Torneo'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="tournamentName">Nombre del Torneo</Label>
                <Input
                  id="tournamentName"
                  data-testid="tournament-name-input"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Australian Open"
                  className="focus-ring"
                  required
                />
              </div>

              <div>
                <Label htmlFor="category">Categoría</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger data-testid="category-select">
                    <SelectValue placeholder="Selecciona categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {TOURNAMENT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label} ({cat.points}p)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="surface">Superficie</Label>
                <Select
                  value={formData.surface}
                  onValueChange={(value) => setFormData({ ...formData, surface: value })}
                >
                  <SelectTrigger data-testid="surface-select">
                    <SelectValue placeholder="Selecciona superficie" />
                  </SelectTrigger>
                  <SelectContent>
                    {SURFACES.map((surface) => (
                      <SelectItem key={surface.value} value={surface.value}>
                        {surface.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="realLocation">Ubicación Real</Label>
                <Input
                  id="realLocation"
                  data-testid="real-location-input"
                  type="text"
                  value={formData.real_location}
                  onChange={(e) => setFormData({ ...formData, real_location: e.target.value })}
                  placeholder="Ej: Melbourne, Australia"
                  className="focus-ring"
                  required
                />
              </div>

              <div>
                <Label htmlFor="fictionalLocation">Ubicación Ficticia</Label>
                <Input
                  id="fictionalLocation"
                  data-testid="fictional-location-input"
                  type="text"
                  value={formData.fictional_location}
                  onChange={(e) => setFormData({ ...formData, fictional_location: e.target.value })}
                  placeholder="Ej: Club Tenis Local"
                  className="focus-ring"
                  required
                />
              </div>

              <div>
                <Label htmlFor="tournamentDate">Fecha del Torneo</Label>
                <Input
                  id="tournamentDate"
                  data-testid="tournament-date-input"
                  type="date"
                  value={formData.tournament_date}
                  onChange={(e) => setFormData({ ...formData, tournament_date: e.target.value })}
                  className="focus-ring"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  data-testid="save-tournament-button"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  disabled={loading}
                >
                  {loading ? 'Guardando...' : (editingTournament ? 'Actualizar' : 'Crear Torneo')}
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
            <Trophy className="w-5 h-5 text-emerald-600" />
            <span>Torneos Registrados</span>
            <span className="text-sm font-normal text-gray-500">({tournaments.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tournaments.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay torneos registrados</h3>
              <p className="text-gray-500 mb-4">Comienza creando tu primer torneo</p>
              <Button
                onClick={() => setIsDialogOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700"
                data-testid="create-first-tournament-button"
              >
                <Plus className="w-4 h-4 mr-2" />
                Crear Primer Torneo
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tournaments.map((tournament, index) => {
                const categoryInfo = getCategoryInfo(tournament.category);
                const surfaceInfo = getSurfaceInfo(tournament.surface);
                
                return (
                  <div
                    key={tournament.id}
                    data-testid={`tournament-card-${index}`}
                    className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-lg p-6 card-hover"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 truncate mb-1">{tournament.name}</h3>
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge className={`${categoryInfo.color} text-white text-xs`}>
                            {tournament.category}
                          </Badge>
                          <Badge className={`${surfaceInfo.color} text-white text-xs`}>
                            {tournament.surface}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-emerald-600">{tournament.points}p</div>
                        <div className="text-xs text-gray-500">
                          {tournament.is_best_of_five ? 'BO5' : 'BO3'}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span className="truncate">{tournament.real_location}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <div className="w-4 h-4 rounded bg-gray-300 flex items-center justify-center">
                          <div className="w-2 h-2 bg-gray-600 rounded"></div>
                        </div>
                        <span className="truncate">{tournament.fictional_location}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(tournament.tournament_date).toLocaleDateString('es-ES')}</span>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(tournament)}
                        data-testid={`edit-tournament-${index}`}
                        className="flex-1 hover:bg-blue-50 hover:border-blue-300"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(tournament.id)}
                        data-testid={`delete-tournament-${index}`}
                        className="flex-1 hover:bg-red-50 hover:border-red-300 text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Eliminar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TournamentManager;