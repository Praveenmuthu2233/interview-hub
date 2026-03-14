import { useState, useEffect } from 'react';
import { supabase, Interview } from '../lib/supabase';
import { Building2, MapPin, Calendar, Filter, Search, Briefcase, Target, TrendingUp, Award } from 'lucide-react';
import AdSenseBlock from './AdSenseBlock';

export default function PublicInterviews() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [filteredInterviews, setFilteredInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterResult, setFilterResult] = useState<string>('All');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('All');

  useEffect(() => {
    fetchInterviews();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [interviews, searchTerm, filterResult, filterDifficulty]);

  const fetchInterviews = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('interviews')
      .select('*')
      .order('created_at', { ascending: false });

    if (data && !error) {
      setInterviews(data);
    }
    setLoading(false);
  };

  const applyFilters = () => {
    let filtered = [...interviews];

    if (searchTerm) {
      filtered = filtered.filter(
        (i) =>
          i.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          i.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
          i.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterResult !== 'All') {
      filtered = filtered.filter((i) => i.result === filterResult);
    }

    if (filterDifficulty !== 'All') {
      filtered = filtered.filter((i) => i.difficulty_level === filterDifficulty);
    }

    setFilteredInterviews(filtered);
  };

  const stats = {
    total: interviews.length,
    companies: new Set(interviews.map(i => i.company_name)).size,
    selected: interviews.filter(i => i.result === 'Selected').length,
    avgRounds: interviews.length > 0 ? (interviews.reduce((sum, i) => sum + i.rounds, 0) / interviews.length).toFixed(1) : 0,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50">
      <header className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-3xl mb-6 shadow-xl">
              <Briefcase className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl font-bold mb-4">Interview Experiences Hub</h1>
            <p className="text-xl text-emerald-50 max-w-2xl mx-auto leading-relaxed">
              Real interview experiences shared by candidates. Get insights, prepare better, and ace your next interview.
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Stories</p>
                <p className="text-4xl font-bold text-emerald-600 mt-2">{stats.total}</p>
              </div>
              <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center">
                <Target className="w-8 h-8 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Companies</p>
                <p className="text-4xl font-bold text-blue-600 mt-2">{stats.companies}</p>
              </div>
              <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center">
                <Building2 className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Success Rate</p>
                <p className="text-4xl font-bold text-green-600 mt-2">
                  {interviews.length > 0 ? Math.round((stats.selected / interviews.length) * 100) : 0}%
                </p>
              </div>
              <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center">
                <Award className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Avg Rounds</p>
                <p className="text-4xl font-bold text-orange-600 mt-2">{stats.avgRounds}</p>
              </div>
              <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        <AdSenseBlock />

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by company, position, or location..."
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none"
              />
            </div>
            <div className="flex gap-4">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={filterResult}
                  onChange={(e) => setFilterResult(e.target.value)}
                  className="pl-10 pr-8 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none appearance-none bg-white"
                >
                  <option value="All">All Results</option>
                  <option value="Selected">Selected</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
              <select
                value={filterDifficulty}
                onChange={(e) => setFilterDifficulty(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none appearance-none bg-white"
              >
                <option value="All">All Levels</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
                <option value="Very Hard">Very Hard</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-gray-300 border-t-emerald-600"></div>
            <p className="mt-4 text-gray-600">Loading interview experiences...</p>
          </div>
        ) : filteredInterviews.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center border border-gray-200">
            <Building2 className="w-20 h-20 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No interviews found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            {filteredInterviews.map((interview, index) => (
              <div key={interview.id}>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 hover:shadow-lg transition-all overflow-hidden">
                  <div className="p-8">
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                            <Building2 className="w-7 h-7 text-white" />
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold text-gray-900">{interview.company_name}</h2>
                            <p className="text-lg text-gray-700 font-medium">{interview.position}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4" />
                            {interview.location}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            {new Date(interview.interview_date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </span>
                          <span className="px-3 py-1 bg-gray-100 rounded-full font-medium">
                            {interview.rounds} Round{interview.rounds > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className={`px-4 py-2 rounded-xl text-sm font-bold shadow-sm ${
                          interview.result === 'Selected' ? 'bg-green-100 text-green-700' :
                          interview.result === 'Rejected' ? 'bg-red-100 text-red-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {interview.result}
                        </span>
                        <span className={`px-4 py-2 rounded-xl text-sm font-bold shadow-sm ${
                          interview.difficulty_level === 'Easy' ? 'bg-blue-100 text-blue-700' :
                          interview.difficulty_level === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                          interview.difficulty_level === 'Hard' ? 'bg-orange-100 text-orange-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {interview.difficulty_level}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-3">Interview Experience</h3>
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{interview.description}</p>
                      </div>

                      {interview.topics_covered && (
                        <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                          <h4 className="text-sm font-bold text-blue-900 mb-2 uppercase tracking-wide">Topics Covered</h4>
                          <p className="text-blue-800">{interview.topics_covered}</p>
                        </div>
                      )}

                      {interview.salary_range && (
                        <div className="bg-green-50 rounded-xl p-5 border border-green-100">
                          <h4 className="text-sm font-bold text-green-900 mb-2 uppercase tracking-wide">Salary Range</h4>
                          <p className="text-green-800 font-semibold text-lg">{interview.salary_range}</p>
                        </div>
                      )}

                      {interview.tips && (
                        <div className="bg-amber-50 rounded-xl p-5 border border-amber-100">
                          <h4 className="text-sm font-bold text-amber-900 mb-2 uppercase tracking-wide">Tips for Candidates</h4>
                          <p className="text-amber-800 leading-relaxed">{interview.tips}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 px-8 py-4 border-t border-gray-200">
                    <p className="text-sm text-gray-500">
                      Posted on {new Date(interview.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                {(index + 1) % 3 === 0 && index < filteredInterviews.length - 1 && (
                  <AdSenseBlock key={`ad-${index}`} />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-12">
          <AdSenseBlock />
        </div>
      </div>

      <footer className="bg-gray-900 text-white mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mb-4">
              <Briefcase className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Interview Experiences Hub</h3>
            <p className="text-gray-400 mb-6">Empowering candidates with real interview insights</p>
            <p className="text-sm text-gray-500">© 2024 Interview Hub. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
