import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import PublicInterviews from './components/PublicInterviews';
import { Shield } from 'lucide-react';

function AppContent() {
  const { user, loading } = useAuth();
  const [showAdmin, setShowAdmin] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-gray-300 border-t-emerald-600 mb-4"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (showAdmin || user) {
    if (!user) {
      return <Login />;
    }
    return <AdminDashboard />;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowAdmin(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-4 rounded-full shadow-2xl hover:shadow-3xl transition-all z-50 hover:scale-110 active:scale-95"
        title="Admin Login"
      >
        <Shield className="w-6 h-6" />
      </button>
      <PublicInterviews />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
