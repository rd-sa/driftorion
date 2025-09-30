import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, Clock, Users, Rocket } from "lucide-react";

export default function Layout({ children }) {
  const location = useLocation();

  const navItems = [
    { name: "Home", path: createPageUrl("Home"), icon: Home },
    { name: "Timeline", path: createPageUrl("Timeline"), icon: Clock },
    { name: "Community", path: createPageUrl("Community"), icon: Users }
  ];

  return (
    <div className="min-h-screen bg-[#0a0e17]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-[#0a0e17]/80 border-b border-cyan-500/20">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to={createPageUrl("Home")} className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-[0_0_20px_rgba(0,217,255,0.4)] group-hover:shadow-[0_0_30px_rgba(0,217,255,0.6)] transition-all duration-300">
                <Rocket className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Orion Drift
              </span>
            </Link>

            {/* Navigation Links */}
            <div className="flex items-center gap-2">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                      isActive
                        ? "bg-cyan-500/20 text-cyan-300 shadow-[0_0_15px_rgba(0,217,255,0.3)]"
                        : "text-gray-400 hover:text-cyan-300 hover:bg-white/5"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline font-medium">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="pt-16">
        {children}
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-cyan-500/20 bg-[#0a0e17]/80 backdrop-blur-sm mt-20">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center text-gray-400 text-sm">
            <p className="mb-2">
              Orion Drift Community Hub • Not affiliated with official game development
            </p>
            <p>
              Built by fans, for fans • All content belongs to their respective creators
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
