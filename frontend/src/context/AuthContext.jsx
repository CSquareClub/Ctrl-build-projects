import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('nexusai_token');
    const storedUser = localStorage.getItem('nexusai_user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const loginSuccess = (data) => {
    setToken(data.access_token);
    setUser(data.user);
    localStorage.setItem('nexusai_token', data.access_token);
    localStorage.setItem('nexusai_user', JSON.stringify(data.user));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('nexusai_token');
    localStorage.removeItem('nexusai_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, loginSuccess, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
