import React, { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";

// Components
import Dashboard from "./components/Dashboard";
import TournamentManager from "./components/TournamentManager";
import MatchManager from "./components/MatchManager";
import PlayerManager from "./components/PlayerManager";
import Navigation from "./components/Navigation";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [players, setPlayers] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch all data on app load
  const fetchData = async () => {
    try {
      setLoading(true);
      const [playersRes, tournamentsRes, matchesRes] = await Promise.all([
        axios.get(`${API}/players`),
        axios.get(`${API}/tournaments`),
        axios.get(`${API}/matches`)
      ]);

      setPlayers(playersRes.data);
      setTournaments(tournamentsRes.data);
      setMatches(matchesRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error al cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4"></div>
          <p className="text-emerald-800 text-lg font-medium">Cargando ATP Tour Simulator...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-100">
      <BrowserRouter>
        <div className="flex">
          <Navigation />
          <div className="flex-1 ml-64">
            <div className="p-8">
              <Routes>
                <Route 
                  path="/" 
                  element={
                    <Dashboard 
                      players={players} 
                      tournaments={tournaments} 
                      matches={matches}
                      refreshData={fetchData}
                    />
                  } 
                />
                <Route 
                  path="/jugadores" 
                  element={
                    <PlayerManager 
                      players={players} 
                      refreshData={fetchData}
                    />
                  } 
                />
                <Route 
                  path="/torneos" 
                  element={
                    <TournamentManager 
                      tournaments={tournaments} 
                      refreshData={fetchData}
                    />
                  } 
                />
                <Route 
                  path="/partidos" 
                  element={
                    <MatchManager 
                      matches={matches}
                      tournaments={tournaments}
                      players={players}
                      refreshData={fetchData}
                    />
                  } 
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </div>
        </div>
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </div>
  );
}

export default App;