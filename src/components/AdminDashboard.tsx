import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Interview } from '../lib/supabase';
import { LogOut, Plus, CreditCard as Edit2, Trash2, Building2, MapPin, Calendar, TrendingUp } from 'lucide-react';
import InterviewForm from './InterviewForm';

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingInterview, setEditingInterview] = useState<Interview | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, selected: 0, rejected: 0, pending: 0 });

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('interviews')
      .select('*')
      .order('created_at', { ascending: false });

    if (data && !error) {
      setInterviews(data);
      setStats({
        total: data.length,
        selected: data.filter(i => i.result === 'Selected').length,
        rejected: data.filter(i => i.result === 'Rejected').length,
        pending: data.filter(i => i.result === 'Pending').length,
      });
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this interview?')) return;

    const { error } = await supabase
      .from('interviews')
      .delete()
      .eq('id', id);

    if (!error) {
      fetchInterviews();
    }
  };

  const handleEdit = (interview: Interview) => {
    setEditingInterview(interview);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingInterview(null);
    fetchInterviews();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50">
      <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Interview Admin Panel</h1>
            </div>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all font-medium"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Interviews</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Selected</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.selected}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{stats.rejected}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <MapPin className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-3xl font-bold text-orange-600 mt-1">{stats.pending}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Manage Interviews</h2>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <Plus className="w-5 h-5" />
            Add Interview
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-emerald-600"></div>
          </div>
        ) : interviews.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
            <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No interviews yet. Add your first interview!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {interviews.map((interview) => (
              <div
                key={interview.id}
                className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{interview.company_name}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        interview.result === 'Selected' ? 'bg-green-100 text-green-700' :
                        interview.result === 'Rejected' ? 'bg-red-100 text-red-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {interview.result}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        interview.difficulty_level === 'Easy' ? 'bg-blue-100 text-blue-700' :
                        interview.difficulty_level === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                        interview.difficulty_level === 'Hard' ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {interview.difficulty_level}
                      </span>
                    </div>
                    <p className="text-lg text-gray-700 font-medium mb-2">{interview.position}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {interview.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(interview.interview_date).toLocaleDateString()}
                      </span>
                      <span>{interview.rounds} Round{interview.rounds > 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(interview)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(interview.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <p className="text-gray-700 mb-3 leading-relaxed">{interview.description}</p>
                {interview.topics_covered && (
                  <p className="text-sm text-gray-600 mb-2">
                    <span className="font-semibold">Topics:</span> {interview.topics_covered}
                  </p>
                )}
                {interview.salary_range && (
                  <p className="text-sm text-gray-600 mb-2">
                    <span className="font-semibold">Salary Range:</span> {interview.salary_range}
                  </p>
                )}
                {interview.tips && (
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">Tips:</span> {interview.tips}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <InterviewForm
          interview={editingInterview}
          onClose={handleFormClose}
        />
      )}
    </div>
  );
}
