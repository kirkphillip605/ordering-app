import React, { useState } from 'react';
import { IonApp, IonContent, IonIcon } from '@ionic/react';
import { clipboardOutline, logInOutline, alertCircleOutline } from 'ionicons/icons';

interface Props {
  onAuth: (token: string, user: { id: string; username: string }) => void;
}

export function AuthScreen({ onAuth }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const endpoint = isSignUp ? '/api/auth/signup' : '/api/auth/login';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');
      localStorage.setItem('token', data.token);
      onAuth(data.token, data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonApp>
      <IonContent className="bg-gray-950 flex items-center justify-center min-h-screen">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.08),transparent_45%)] pointer-events-none" />
        <div className="max-w-md w-full mx-auto px-6 py-12 flex flex-col justify-center min-h-screen">
          <div className="glass-panel rounded-3xl p-8 border border-gray-800/80 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-teal-500/50 to-transparent" />
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 mb-4 shadow-lg shadow-teal-500/5">
                <IonIcon icon={clipboardOutline} className="text-3xl" />
              </div>
              <h1 className="text-3xl font-bold text-white tracking-tight">ChefList</h1>
              <p className="text-gray-400 mt-2 text-sm">Smart Restaurant Purchase Lists</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Username</label>
                <input type="text" required value={username} onChange={e => setUsername(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-900/80 border border-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500/50 transition-all-200 input-glow"
                  placeholder="Enter your username" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Password</label>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-900/80 border border-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500/50 transition-all-200 input-glow"
                  placeholder="••••••••" />
              </div>
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <IonIcon icon={alertCircleOutline} className="text-lg shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <button type="submit" disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-teal-500 hover:bg-teal-600 disabled:opacity-60 text-gray-950 font-bold shadow-lg shadow-teal-500/10 transition duration-200 flex items-center justify-center gap-2">
                <IonIcon icon={logInOutline} className="text-xl" />
                {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
              </button>
            </form>
            <div className="mt-6 text-center">
              <button onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
                className="text-teal-400 hover:text-teal-300 text-xs font-semibold transition-all-200">
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </button>
            </div>
          </div>
        </div>
      </IonContent>
    </IonApp>
  );
}
