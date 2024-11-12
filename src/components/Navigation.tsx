import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Dna, Search, Home, BookOpen, Settings } from 'lucide-react';

export default function Navigation() {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed top-0 w-full bg-white border-b border-gray-200 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link to="/" className="flex items-center">
              <Dna className="h-8 w-8 text-indigo-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">ProteinViz Pro</span>
            </Link>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <NavLink to="/" icon={<Home />} text="Home" isActive={isActive('/')} />
              <NavLink to="/search" icon={<Search />} text="Search" isActive={isActive('/search')} />
              <NavLink to="/learn" icon={<BookOpen />} text="Learn" isActive={isActive('/learn')} />
            </div>
          </div>
          <div className="flex items-center">
            <button className="p-2 rounded-full hover:bg-gray-100">
              <Settings className="h-6 w-6 text-gray-500" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

interface NavLinkProps {
  to: string;
  icon: React.ReactNode;
  text: string;
  isActive: boolean;
}

function NavLink({ to, icon, text, isActive }: NavLinkProps) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
        isActive
          ? 'text-indigo-600 border-b-2 border-indigo-600'
          : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      <span className="mr-2">{icon}</span>
      {text}
    </Link>
  );
}