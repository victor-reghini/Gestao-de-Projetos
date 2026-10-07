import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { auth, googleProvider, getEnvVar } from '@/services/firebase';
import { User } from '@/types';
import { SystemSettingsService } from '@/services/systemSettingsService';
import { CloudSqlService } from '@/services/cloudSqlService';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  isDemo: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginDemo: () => void;
  loginWithTestUser: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUser: (name: string, avatarUrl?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const PROD_TEST_USER: User = {
  id: getEnvVar('VITE_TEST_USER_ID', 'demo-user-123'),
  name: getEnvVar('VITE_TEST_USER_NAME', 'Victor Reghini'),
  email: getEnvVar('VITE_TEST_USER_EMAIL', 'contato@victorreghini.com.br'),
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    // Check if demo user is active in session
    const savedDemo = sessionStorage.getItem('gestao_demo_user');
    if (savedDemo) {
      setUser(JSON.parse(savedDemo));
      setIsDemo(true);
      setLoading(false);
      return;
    }

    // Ambiente de desenvolvimento local: inicia automaticamente com o usuário de testes se não houve logout manual
    const isTestRuntime = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
    const manualLogout = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('gestao_manual_logout');
    if (!manualLogout && !isTestRuntime && (import.meta as any).env?.DEV) {
      sessionStorage.setItem('gestao_demo_user', JSON.stringify(PROD_TEST_USER));
      setUser(PROD_TEST_USER);
      setIsDemo(true);
      setLoading(false);
      return;
    }

    try {
      const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
        setFirebaseUser(fbUser);
        if (fbUser) {
          setUser({
            id: fbUser.uid,
            name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Usuário',
            email: fbUser.email || '',
            avatarUrl: fbUser.photoURL || undefined,
            createdAt: fbUser.metadata.creationTime || new Date().toISOString(),
            updatedAt: fbUser.metadata.lastSignInTime || new Date().toISOString()
          });
          setIsDemo(false);
        } else if (!isDemo) {
          setUser(null);
        }
        setLoading(false);
      }, (err) => {
        console.warn('Auth observer error (using demo/offline mode):', err);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.warn('Firebase auth init error:', err);
      setLoading(false);
    }
  }, [isDemo]);

  const login = async (email: string, pass: string) => {
    try {
      const res = await signInWithEmailAndPassword(auth, email, pass);
      sessionStorage.removeItem('gestao_demo_user');
      setIsDemo(false);
      setUser({
        id: res.user.uid,
        name: res.user.displayName || res.user.email?.split('@')[0] || 'Usuário',
        email: res.user.email || '',
        avatarUrl: res.user.photoURL || undefined,
        createdAt: res.user.metadata.creationTime || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } catch (error: any) {
      throw new Error(error.message || 'Falha ao autenticar.');
    }
  };

  const register = async (name: string, email: string, pass: string) => {
    const currentSettings = SystemSettingsService.getLocalSettings();
    if (currentSettings.allowRegistration === false) {
      throw new Error('O cadastro de novas contas está temporariamente desativado pelo administrador do sistema.');
    }

    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(res.user, { displayName: name });
      sessionStorage.removeItem('gestao_demo_user');
      setIsDemo(false);
      const newUser: User = {
        id: res.user.uid,
        name,
        email: res.user.email || '',
        avatarUrl: res.user.photoURL || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setUser(newUser);
      CloudSqlService.syncUser(newUser).catch(() => {});
    } catch (error: any) {
      throw new Error(error.message || 'Falha ao criar conta.');
    }
  };

  const loginWithGoogle = async () => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      sessionStorage.removeItem('gestao_demo_user');
      setIsDemo(false);
      setUser({
        id: res.user.uid,
        name: res.user.displayName || 'Usuário Google',
        email: res.user.email || '',
        avatarUrl: res.user.photoURL || undefined,
        createdAt: res.user.metadata.creationTime || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } catch (error: any) {
      throw new Error(error.message || 'Falha no login com Google.');
    }
  };

  const loginDemo = () => {
    sessionStorage.removeItem('gestao_manual_logout');
    sessionStorage.setItem('gestao_demo_user', JSON.stringify(PROD_TEST_USER));
    setUser(PROD_TEST_USER);
    setIsDemo(true);
  };

  const loginWithTestUser = async () => {
    sessionStorage.removeItem('gestao_manual_logout');
    const testEmail = getEnvVar('VITE_TEST_USER_EMAIL', 'contato@victorreghini.com.br');
    const testPass = getEnvVar('VITE_TEST_USER_PASSWORD', '');
    if (testEmail && testPass) {
      try {
        await login(testEmail, testPass);
        return;
      } catch (err) {
        console.warn('Login com credenciais de teste em produção falhou, utilizando sessão de teste local:', err);
      }
    }
    loginDemo();
  };

  const logout = async () => {
    sessionStorage.setItem('gestao_manual_logout', 'true');
    sessionStorage.removeItem('gestao_demo_user');
    setIsDemo(false);
    setUser(null);
    try {
      await fbSignOut(auth);
    } catch (err) {
      console.warn('Signout error:', err);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao enviar email de recuperação.');
    }
  };

  const updateUser = async (name: string, avatarUrl?: string) => {
    if (firebaseUser) {
      await updateProfile(firebaseUser, { displayName: name, photoURL: avatarUrl });
    }
    if (user) {
      const updated = { ...user, name, avatarUrl: avatarUrl || user.avatarUrl, updatedAt: new Date().toISOString() };
      setUser(updated);
      if (isDemo) {
        sessionStorage.setItem('gestao_demo_user', JSON.stringify(updated));
      }
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      firebaseUser,
      loading,
      isDemo,
      login,
      register,
      loginWithGoogle,
      loginDemo,
      loginWithTestUser,
      logout,
      resetPassword,
      updateUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  return context;
};
