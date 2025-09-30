import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Trophy, Users, Calendar, Target, Home } from 'lucide-react';

const Navigation = () => {
  const location = useLocation();

  const navItems = [
    {
      path: '/',
      name: 'Dashboard',
      icon: Home,
      description: 'Visión general'
    },
    {
      path: '/jugadores',
      name: 'Jugadores',
      icon: Users,
      description: 'Gestionar jugadores'
    },
    {
      path: '/torneos',
      name: 'Torneos',
      icon: Calendar,
      description: 'Gestionar torneos'
    },
    {
      path: '/partidos',
      name: 'Partidos',
      icon: Target,
      description: 'Registrar partidos'
    }
  ];

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-white shadow-xl z-50">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold gradient-text">ATP Tour</h1>
            <p className="text-sm text-gray-500">Simulator</p>
          </div>
        </div>
      </div>

      <nav className="p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  data-testid={`nav-${item.name.toLowerCase()}`}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                  <div>
                    <div className={`font-medium ${isActive ? 'text-emerald-700' : 'text-gray-700'}`}>
                      {item.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {item.description}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="absolute bottom-6 left-6 right-6">
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-4 border border-emerald-100">
          <div className="text-sm font-medium text-emerald-800 mb-1">Simulador ATP Tour</div>
          <div className="text-xs text-emerald-600">
            Gestiona tus torneos y estadísticas como un profesional
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navigation;