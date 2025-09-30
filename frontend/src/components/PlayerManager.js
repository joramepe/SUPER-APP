import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Plus, Users, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PlayerManager = ({ players, refreshData }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [formData, setFormData] = useState({ name: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('El nombre del jugador es obligatorio');
      return;
    }

    setLoading(true);
    try {
      if (editingPlayer) {
        await axios.put(`${API}/players/${editingPlayer.id}`, formData);
        toast.success('Jugador actualizado correctamente');
      } else {
        await axios.post(`${API}/players`, formData);
        toast.success('Jugador creado correctamente');
      }
      
      setIsDialogOpen(false);
      setEditingPlayer(null);
      setFormData({ name: '' });
      refreshData();
    } catch (error) {
      console.error('Error saving player:', error);
      toast.error(editingPlayer ? 'Error al actualizar jugador' : 'Error al crear jugador');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (player) => {
    setEditingPlayer(player);
    setFormData({ name: player.name });
    setIsDialogOpen(true);
  };

  const handleDelete = async (playerId) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este jugador?')) {
      return;
    }

    try {
      await axios.delete(`${API}/players/${playerId}`);
      toast.success('Jugador eliminado correctamente');
      refreshData();
    } catch (error) {
      console.error('Error deleting player:', error);
      toast.error('Error al eliminar jugador');
    }
  };

  const resetForm = () => {
    setEditingPlayer(null);
    setFormData({ name: '' });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Gestión de Jugadores</h1>
          <p className="text-gray-600 mt-1">Administra los jugadores del tour</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="btn-hover bg-emerald-600 hover:bg-emerald-700" data-testid="add-player-button">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Jugador
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingPlayer ? 'Editar Jugador' : 'Nuevo Jugador'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="playerName">Nombre del Jugador</Label>
                <Input
                  id="playerName"
                  data-testid="player-name-input"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Rafael Nadal"
                  className="focus-ring"
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  data-testid="save-player-button"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  disabled={loading}
                >
                  {loading ? 'Guardando...' : (editingPlayer ? 'Actualizar' : 'Crear Jugador')}
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
            <Users className="w-5 h-5 text-emerald-600" />
            <span>Jugadores Registrados</span>
            <span className="text-sm font-normal text-gray-500">({players.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {players.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay jugadores registrados</h3>
              <p className="text-gray-500 mb-4">Comienza creando tu primer jugador</p>
              <Button
                onClick={() => setIsDialogOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700"
                data-testid="create-first-player-button"
              >
                <Plus className="w-4 h-4 mr-2" />
                Crear Primer Jugador
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {players.map((player, index) => (
                <div
                  key={player.id}
                  data-testid={`player-card-${index}`}
                  className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-lg p-6 card-hover"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {player.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{player.name}</h3>
                        <p className="text-sm text-gray-500">
                          Creado: {new Date(player.created_at).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(player)}
                      data-testid={`edit-player-${index}`}
                      className="flex-1 hover:bg-blue-50 hover:border-blue-300"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(player.id)}
                      data-testid={`delete-player-${index}`}
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

export default PlayerManager;