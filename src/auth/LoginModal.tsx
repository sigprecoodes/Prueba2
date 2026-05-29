import React, { useState, useEffect } from "react";
import { User } from "../types";
import { Lock, User as UserIcon, LogIn, Key, ShieldAlert, BadgePlus, LogOut, CheckCircle, Eye, EyeOff } from "lucide-react";
import { cn } from "../lib/utils";

// Initialize base demo users in local memory
const BASE_DEMO_USERS = [
  { username: "administracion", name: "administración", password: "123", role: "auxiliar" as const },
  { username: "supervisor", name: "Supervisor de Campo", password: "123", role: "supervisor" as const },
  { username: "Auxiliar 1", name: "Juliana Londoño", password: "Auxiliar0100", role: "auxiliar" as const },
  { username: "Auxiliar 2", name: "Sara Gil", password: "Auxiliar0200", role: "auxiliar" as const },
  { username: "Supervisor9", name: "Anderson", password: "supervisoranderson", role: "supervisor" as const },
  { username: "Supervisor 1", name: "Johan", password: "supervisorjohan", role: "supervisor" as const },
  { username: "Supervisor 2", name: "Carol", password: "supervisorcarol", role: "supervisor" as const },
  { username: "Supervisor 3", name: "Yonatan", password: "supervisoryonatan", role: "supervisor" as const },
  { username: "Supervisor 4", name: "Marcos", password: "supervisormarcos", role: "supervisor" as const },
  { username: "Supervisor 5", name: "Herney", password: "supervisorherney", role: "supervisor" as const },
  { username: "Supervisor 6", name: "NN", password: "supervisor6Password", role: "supervisor" as const },
  { username: "Supervisor 7", name: "Leandro", password: "supervisorleandro", role: "supervisor" as const },
  { username: "Supervisor 8", name: "Jorman", password: "supervisorjorman", role: "supervisor" as const },
  { username: "Supervisor 10", name: "Angela", password: "supervisorangela", role: "supervisor" as const },
  { username: "Supervisor 11", name: "Nelson", password: "supervisornelson", role: "supervisor" as const }
];

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredRole?: "auxiliar" | "supervisor" | null;
  onLoginSuccess: (user: User) => void;
  currentUser?: User | null;
  onLogout?: () => void;
}

export default function LoginModal({
  isOpen,
  onClose,
  requiredRole,
  onLoginSuccess,
  currentUser,
  onLogout
}: LoginModalProps) {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  
  // Registration Form
  const [regUsername, setRegUsername] = useState("");
  const [regName, setRegName] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regRole, setRegRole] = useState<"auxiliar" | "supervisor">("auxiliar");
  const [regMessage, setRegMessage] = useState({ text: "", type: "" });

  // Login Form
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Load physical user list from localStorage, merging with new BASE_DEMO_USERS
  const getUsersList = () => {
    const stored = localStorage.getItem("app_regional_users");
    let storedUsers: any[] = [];
    if (stored) {
      try {
        storedUsers = JSON.parse(stored);
        if (!Array.isArray(storedUsers)) {
          storedUsers = [];
        }
      } catch {
        storedUsers = [];
      }
    }
    
    // Merge BASE_DEMO_USERS with stored ones.
    // If a user with the same username exists, keep the one from BASE_DEMO_USERS (to allow updates in code).
    const merged = [...BASE_DEMO_USERS];
    
    storedUsers.forEach((su: any) => {
      if (su && su.username) {
        const alreadyExists = merged.some(
          (bu: any) => bu.username.toLowerCase() === su.username.toLowerCase()
        );
        if (!alreadyExists) {
          merged.push(su);
        }
      }
    });

    // Save the merged version back to localStorage
    localStorage.setItem("app_regional_users", JSON.stringify(merged));
    return merged;
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername.trim() || !regName.trim() || !regPassword) {
      setRegMessage({ text: "Por favor complete todos los campos", type: "error" });
      return;
    }

    const currentUsers = getUsersList();
    const cleanUsername = regUsername.trim().toLowerCase();

    // Check conflict
    const exists = currentUsers.some((u: any) => u.username.toLowerCase() === cleanUsername);
    if (exists) {
      setRegMessage({ text: "El usuario ya existe. Elija otro nombre de usuario.", type: "error" });
      return;
    }

    const newUser = {
      username: cleanUsername,
      name: regName.trim(),
      password: regPassword,
      role: regRole
    };

    const updated = [...currentUsers, newUser];
    localStorage.setItem("app_regional_users", JSON.stringify(updated));

    setRegMessage({ text: "¡Cuenta creada con éxito! Ahora puede iniciar sesión.", type: "success" });
    
    // Auto-login or shift to login tab with filled data
    setLoginUsername(cleanUsername);
    setLoginPassword(regPassword);
    
    setTimeout(() => {
      setActiveTab("login");
      setRegUsername("");
      setRegName("");
      setRegPassword("");
      setRegMessage({ text: "", type: "" });
    }, 1500);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    const currentUsers = getUsersList();
    const cleanUsername = loginUsername.trim().toLowerCase();

    const matched = currentUsers.find(
      (u: any) => u.username.toLowerCase() === cleanUsername && String(u.password) === String(loginPassword)
    );

    if (!matched) {
      setLoginError("Usuario o contraseña incorrectos");
      return;
    }

    // Role eligibility check (Supervisor can do auxiliary roles, let's keep it clean or report warnings)
    if (requiredRole && matched.role !== requiredRole && matched.role !== "supervisor") {
      setLoginError(`Este módulo requiere acceso de ${requiredRole === "auxiliar" ? "Auxiliar" : "Supervisor"}`);
      return;
    }

    // Login success
    const loggedInUser: User = {
      username: matched.username,
      name: matched.name,
      role: matched.role
    };

    onLoginSuccess(loggedInUser);
    onClose();
  };

  const handleQuickDemoLogin = (username: string, role: string) => {
    const currentUsers = getUsersList();
    const matched = currentUsers.find((u: any) => u.username === username);
    if (matched) {
      setLoginUsername(matched.username);
      setLoginPassword(matched.password);
      
      const loggedUser: User = {
        username: matched.username,
        name: matched.name,
        role: matched.role
      };
      
      onLoginSuccess(loggedUser);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[32px] shadow-2xl border border-neutral-100 w-full max-w-md overflow-hidden relative flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-neutral-50 p-6 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-neutral-950 flex items-center justify-center text-white">
              <Lock size={18} />
            </div>
            <div>
              <h3 className="text-[30px] font-bold text-gray-800 border-bottom mb-2 justify-center flex items-center gap-2">
                {currentUser ? "Gestionar Sesión" : "Acceso"}
              </h3>
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider">
                {requiredRole ? `Este módulo solo está disponible para ${requiredRole}` : ""}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-neutral-200 flex items-center justify-center font-bold text-neutral-400"
          >
            ×
          </button>
        </div>

        {/* Logged In View */}
        {currentUser ? (
          <div className="p-6 md:p-8 space-y-6 overflow-y-auto">
            <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 flex flex-col items-center text-center">
              <CheckCircle className="w-12 h-12 text-emerald-500 mb-3" />
              <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">Sesión Activa</p>
              <h4 className="text-lg font-bold text-gray-900 leading-tight">{currentUser.name}</h4>
              <p className="text-xs text-neutral-500 font-medium">@{currentUser.username}</p>
              <div className="mt-4 px-3 py-1 bg-emerald-100 border border-emerald-200 rounded-full text-[10px] font-black uppercase text-emerald-700 tracking-wider">
                {currentUser.role}
              </div>
            </div>

            <button
              onClick={() => {
                if (onLogout) onLogout();
                onClose();
              }}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold uppercase py-3.5 rounded-xl text-xs tracking-widest transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-100"
            >
              <LogOut size={16} />
              Cerrar Sesión Activa
            </button>
          </div>
        ) : (
          /* Locked Views */
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
            

            {/* Tabs Trigger */}
            <div className="flex bg-neutral-100 p-1.5 rounded-xl border border-neutral-200/40">
              <button
                onClick={() => { setActiveTab("login"); setLoginError(""); }}
                className={cn(
                  "flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                  activeTab === "login" ? "bg-white text-black shadow-sm" : "text-neutral-400 hover:text-neutral-700"
                )}
              >
                Ingresar
              </button>
              <button
                onClick={() => { setActiveTab("register"); setRegMessage({ text: "", type: "" }); }}
                className={cn(
                  "flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                  activeTab === "register" ? "bg-white text-black shadow-sm" : "text-neutral-400 hover:text-neutral-700"
                )}
              >
                Crear Cuenta
              </button>
            </div>

            {/* Login Section */}
            {activeTab === "login" ? (
              <form onSubmit={handleLogin} className="space-y-4">
                {loginError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-750 text-xs font-bold rounded-xl text-center">
                    {loginError}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest pl-1">Usuario</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      type="text"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      className="w-full bg-neutral-50/50 hover:bg-neutral-50 border border-neutral-200/80 focus:border-black focus:ring-1 focus:ring-black outline-none rounded-xl pl-11 pr-4 py-3 text-sm font-medium text-neutral-800 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 animate-in fade-in duration-300">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest pl-1">Contraseña</label>
                  <div className="relative">
                    <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full bg-neutral-50/50 hover:bg-neutral-50 border border-neutral-200/80 focus:border-black focus:ring-1 focus:ring-black outline-none rounded-xl pl-11 pr-11 py-3 text-sm font-medium text-neutral-800 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-800"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-black hover:bg-neutral-900 text-white font-extrabold uppercase py-3.5 rounded-xl text-xs tracking-widest transition-all shadow-md active:scale-95 duration-200 flex items-center justify-center gap-2"
                >
                  <LogIn size={14} />
                  Iniciar Sesión
                </button>

                {/* Demo Presets Helper */}
                
              </form>
            ) : (
              /* Local Account Creator (No puedo conectar cuentas de la organizacion entonces toca crearlas) */
              <form onSubmit={handleRegister} className="space-y-4">
                {regMessage.text && (
                  <div className={cn(
                    "p-3 text-xs font-bold rounded-xl text-center border",
                    regMessage.type === "success" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-850"
                  )}>
                    {regMessage.text}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest pl-1">Nombre Completo</label>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full bg-neutral-50/50 hover:bg-neutral-50 border border-neutral-200/80 focus:border-black focus:ring-1 focus:ring-black outline-none rounded-xl px-4 py-2.5 text-sm font-medium text-neutral-800 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest pl-1">Usuario de Acceso</label>
                  <input
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    className="w-full bg-neutral-50/50 hover:bg-neutral-50 border border-neutral-200/80 focus:border-black focus:ring-1 focus:ring-black outline-none rounded-xl px-4 py-2.5 text-sm font-medium text-neutral-800 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest pl-1">Contraseña</label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full bg-neutral-50/50 hover:bg-neutral-50 border border-neutral-200/80 focus:border-black focus:ring-1 focus:ring-black outline-none rounded-xl px-4 py-2.5 text-sm font-medium text-neutral-800 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-black hover:bg-neutral-900 text-white font-extrabold uppercase py-3.5 rounded-xl text-xs tracking-widest transition-all shadow-md active:scale-95 duration-200 flex items-center justify-center gap-2"
                >
                  <BadgePlus size={15} />
                  Crear y Registrar Cuenta
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}