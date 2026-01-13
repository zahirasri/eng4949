
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, 
  Upload, 
  Calendar, 
  User, 
  MapPin, 
  Clock, 
  Settings, 
  ChevronRight,
  ClipboardList,
  AlertCircle,
  LogOut,
  BarChart3,
  Loader2,
  Filter,
  CheckCircle2
} from 'lucide-react';
import { ScheduleEntry, AppView, LecturerStats } from './types';
import { parseRawSchedule, getLecturerAdvice } from './services/geminiService';

type RoleFilter = 'ALL' | 'EXAMINER' | 'SUPERVISOR';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.LANDING);
  const [scheduleData, setScheduleData] = useState<ScheduleEntry[]>([]);
  const [searchInitials, setSearchInitials] = useState('');
  const [activeRoleFilter, setActiveRoleFilter] = useState<RoleFilter>('EXAMINER');
  
  const [fullLecturerSchedule, setFullLecturerSchedule] = useState<ScheduleEntry[]>([]);
  const [stats, setStats] = useState<LecturerStats | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiAdvice, setAiAdvice] = useState('');
  const [rawInput, setRawInput] = useState('');

  // Persist schedule data
  useEffect(() => {
    const saved = localStorage.getItem('academic_schedule_data');
    if (saved) {
      setScheduleData(JSON.parse(saved));
    }
  }, []);

  const handleDataUpload = async () => {
    if (!rawInput.trim()) return;
    setIsProcessing(true);
    try {
      const parsed = await parseRawSchedule(rawInput);
      if (parsed.length > 0) {
        setScheduleData(parsed);
        localStorage.setItem('academic_schedule_data', JSON.stringify(parsed));
        setView(AppView.LANDING);
        setRawInput('');
      } else {
        alert("Failed to extract valid schedule data. Please check your text format.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while parsing data.");
    } finally {
      setIsProcessing(false);
    }
  };

  const performSearch = useCallback(async (initials: string) => {
    if (!initials) return;
    const searchLower = initials.toLowerCase().trim();
    
    const matched = scheduleData.filter(item => 
      item.supervisor.toLowerCase().includes(searchLower) ||
      item.examiner1.toLowerCase().includes(searchLower) ||
      (item.examiner2 && item.examiner2.toLowerCase().includes(searchLower))
    );

    if (matched.length > 0) {
      setFullLecturerSchedule(matched);
      const locations = Array.from(new Set(matched.map(m => m.location)));
      const supervisorCount = matched.filter(m => m.supervisor.toLowerCase().includes(searchLower)).length;
      
      setStats({
        totalPresentations: matched.length,
        roles: {
          supervisor: supervisorCount,
          examiner: matched.length - supervisorCount
        },
        locations
      });

      // Default to showing Examiner view first if they have examiner slots, 
      // otherwise fallback to whatever they have.
      const hasExaminerSlots = matched.some(m => !m.supervisor.toLowerCase().includes(searchLower));
      setActiveRoleFilter(hasExaminerSlots ? 'EXAMINER' : 'SUPERVISOR');
      
      setView(AppView.DASHBOARD);
      
      // Get AI encouragement
      const advice = await getLecturerAdvice(initials, matched);
      setAiAdvice(advice);
    } else {
      alert("No schedule found for initials: " + initials);
    }
  }, [scheduleData]);

  // Derived filtered schedule based on current tab
  const displayedSchedule = useMemo(() => {
    const searchLower = searchInitials.toLowerCase().trim();
    if (activeRoleFilter === 'ALL') return fullLecturerSchedule;
    
    return fullLecturerSchedule.filter(item => {
      const isSupervisor = item.supervisor.toLowerCase().includes(searchLower);
      if (activeRoleFilter === 'SUPERVISOR') return isSupervisor;
      if (activeRoleFilter === 'EXAMINER') return !isSupervisor;
      return true;
    });
  }, [fullLecturerSchedule, activeRoleFilter, searchInitials]);

  const clearData = () => {
    if (confirm("Are you sure you want to clear all schedule data?")) {
      setScheduleData([]);
      localStorage.removeItem('academic_schedule_data');
      setView(AppView.ADMIN);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer group" 
            onClick={() => setView(AppView.LANDING)}
          >
            <div className="bg-indigo-600 p-2 rounded-lg group-hover:bg-indigo-700 transition-colors">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 hidden sm:block">ScheduleHub</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setView(AppView.ADMIN)}
              className="text-slate-500 hover:text-indigo-600 p-2 rounded-full hover:bg-slate-50 transition-colors"
              title="Admin Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            {view !== AppView.LANDING && (
              <button 
                onClick={() => setView(AppView.LANDING)}
                className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100"
              >
                <LogOut className="w-4 h-4" />
                <span>Exit Dashboard</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {/* Landing View: Search */}
        {view === AppView.LANDING && (
          <div className="max-w-2xl mx-auto mt-12 text-center">
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">Lecturer Timetable Access</h2>
            <p className="text-lg text-slate-600 mb-10">Enter your initials to view your examination slots and student presentations.</p>
            
            {scheduleData.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 p-8 rounded-2xl text-center shadow-sm">
                <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-amber-900 mb-2">System Ready, Data Missing</h3>
                <p className="text-amber-800 mb-8 max-w-sm mx-auto">Please upload the presentation schedule (Excel/Sheets text) to begin.</p>
                <button 
                  onClick={() => setView(AppView.ADMIN)}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg flex items-center gap-2 mx-auto"
                >
                  <Upload className="w-5 h-5" />
                  Initial Data Setup
                </button>
              </div>
            ) : (
              <div className="relative group max-w-lg mx-auto">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                  <Search className="w-6 h-6" />
                </div>
                <input 
                  type="text"
                  placeholder="e.g., Dr. AJ or Prof. Z"
                  className="w-full pl-14 pr-28 py-5 text-xl rounded-2xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all shadow-sm"
                  value={searchInitials}
                  onChange={(e) => setSearchInitials(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && performSearch(searchInitials)}
                />
                <button 
                  onClick={() => performSearch(searchInitials)}
                  className="absolute right-3 top-3 bottom-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-xl transition-all flex items-center gap-2"
                >
                  View
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Dashboard View */}
        {view === AppView.DASHBOARD && stats && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-8">
              <div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">Presentation Hub</h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-sm font-bold uppercase tracking-wide">Lecturer</span>
                  <span className="text-xl font-medium text-slate-600">{searchInitials}</span>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4 min-w-[160px]">
                  <div className="bg-emerald-100 p-2 rounded-lg">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">As Examiner</p>
                    <p className="text-2xl font-black text-slate-900">{stats.roles.examiner}</p>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4 min-w-[160px]">
                  <div className="bg-indigo-100 p-2 rounded-lg">
                    <User className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">As Supervisor</p>
                    <p className="text-2xl font-black text-slate-900">{stats.roles.supervisor}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Role Filter Tabs */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex p-1 bg-slate-200/50 rounded-xl w-full sm:w-auto">
                <button 
                  onClick={() => setActiveRoleFilter('EXAMINER')}
                  className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeRoleFilter === 'EXAMINER' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Examine ({stats.roles.examiner})
                </button>
                <button 
                  onClick={() => setActiveRoleFilter('SUPERVISOR')}
                  className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeRoleFilter === 'SUPERVISOR' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Supervise ({stats.roles.supervisor})
                </button>
                <button 
                  onClick={() => setActiveRoleFilter('ALL')}
                  className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeRoleFilter === 'ALL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  All ({stats.totalPresentations})
                </button>
              </div>
              
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <Filter className="w-4 h-4" />
                <span>Showing {activeRoleFilter.toLowerCase()} sessions</span>
              </div>
            </div>

            {aiAdvice && activeRoleFilter === 'ALL' && (
              <div className="bg-gradient-to-r from-indigo-50 to-white border-l-4 border-indigo-500 p-5 rounded-r-2xl shadow-sm">
                <div className="flex gap-4">
                  <div className="bg-indigo-100 p-2 rounded-full h-fit mt-1">
                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                  </div>
                  <p className="text-indigo-900 text-lg font-medium leading-relaxed italic">"{aiAdvice}"</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Detailed Schedule Cards */}
              <div className="lg:col-span-2 space-y-6">
                {displayedSchedule.length > 0 ? (
                  displayedSchedule.map((item) => (
                    <div key={item.id} className="bg-white p-7 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:border-indigo-100 transition-all group relative overflow-hidden">
                      {/* Role accent bar */}
                      <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${item.supervisor.toLowerCase().includes(searchInitials.toLowerCase()) ? 'bg-indigo-500' : 'bg-emerald-500'}`}></div>
                      
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <div className="flex gap-5 items-center">
                          <div className="bg-slate-50 p-4 rounded-2xl flex flex-col items-center justify-center min-w-[90px] border border-slate-100">
                            <span className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-1">{item.date.split('-')[1] || 'JAN'}</span>
                            <span className="text-3xl font-black text-slate-900">{item.date.split('-')[2] || item.date.split(' ')[0] || '12'}</span>
                          </div>
                          <div>
                            <h4 className="text-2xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                              {item.studentName}
                            </h4>
                            <p className="text-slate-500 font-medium">{item.projectTitle || "Research Proposal Presentation"}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest border-2 ${item.supervisor.toLowerCase().includes(searchInitials.toLowerCase()) ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                            {item.supervisor.toLowerCase().includes(searchInitials.toLowerCase()) ? 'Supervisor Role' : 'Examiner Role'}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-5 bg-slate-50 rounded-2xl">
                        <div className="flex items-center gap-4">
                          <div className="bg-white p-2.5 rounded-xl shadow-sm">
                            <Clock className="w-5 h-5 text-indigo-500" />
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Time Slot</p>
                            <p className="text-slate-900 font-bold">{item.startTime} — {item.endTime}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="bg-white p-2.5 rounded-xl shadow-sm">
                            <MapPin className="w-5 h-5 text-rose-500" />
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Presentation Venue</p>
                            <p className="text-slate-900 font-bold">{item.location}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 flex flex-wrap gap-3">
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                          <User className="w-4 h-4 text-slate-400" />
                          <span className="text-xs text-slate-600 font-bold">Sup: <span className="text-slate-900">{item.supervisor}</span></span>
                        </div>
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                          <User className="w-4 h-4 text-slate-400" />
                          <span className="text-xs text-slate-600 font-bold">Ex 1: <span className="text-slate-900">{item.examiner1}</span></span>
                        </div>
                        {item.examiner2 && (
                          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                            <User className="w-4 h-4 text-slate-400" />
                            <span className="text-xs text-slate-600 font-bold">Ex 2: <span className="text-slate-900">{item.examiner2}</span></span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-12 rounded-3xl text-center">
                    <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-slate-900">No {activeRoleFilter.toLowerCase()} slots</h3>
                    <p className="text-slate-500 mt-2">You don't have any presentations scheduled as a {activeRoleFilter.toLowerCase()} in the current record.</p>
                    <button 
                      onClick={() => setActiveRoleFilter('ALL')}
                      className="mt-6 text-indigo-600 font-bold hover:underline"
                    >
                      View all your sessions
                    </button>
                  </div>
                )}
              </div>

              {/* Sidebar Info */}
              <div className="space-y-6">
                <div className="bg-white p-7 rounded-3xl shadow-sm border border-slate-100">
                  <h3 className="text-lg font-black text-slate-900 mb-5 flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-indigo-500" />
                    Venue List
                  </h3>
                  <div className="space-y-3">
                    {stats.locations.map(loc => (
                      <div key={loc} className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-colors">
                        <span className="font-bold text-slate-700">{loc}</span>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-900 p-8 rounded-3xl shadow-2xl text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 -m-8 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl"></div>
                  <div className="absolute bottom-0 left-0 -m-8 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>
                  
                  <h3 className="text-xl font-black mb-6 relative z-10 tracking-tight">Schedule Load</h3>
                  <div className="space-y-6 relative z-10">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Total Duty</p>
                        <p className="text-3xl font-black">{stats.totalPresentations}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Ratio</p>
                        <p className="text-sm font-bold text-indigo-400">
                          {Math.round((stats.roles.supervisor / stats.totalPresentations) * 100)}% Sup
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden flex">
                        <div 
                          className="bg-indigo-500 h-full transition-all duration-1000 shadow-[0_0_15px_rgba(99,102,241,0.5)]" 
                          style={{ width: `${(stats.roles.supervisor / stats.totalPresentations) * 100}%` }}
                        ></div>
                        <div 
                          className="bg-emerald-500 h-full transition-all duration-1000 shadow-[0_0_15px_rgba(16,185,129,0.5)]" 
                          style={{ width: `${(stats.roles.examiner / stats.totalPresentations) * 100}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                        <span className="text-indigo-400">Supervisor ({stats.roles.supervisor})</span>
                        <span className="text-emerald-400">Examiner ({stats.roles.examiner})</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed border-t border-slate-800 pt-4">
                      All timing entries are strictly for Bachelor Project Research Proposal presentations.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Admin/Setup View */}
        {view === AppView.ADMIN && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Schedule Management</h2>
                <p className="text-slate-500 font-medium">Configure the central database for all lecturers.</p>
              </div>
              {scheduleData.length > 0 && (
                <button 
                  onClick={clearData}
                  className="bg-red-50 hover:bg-red-100 text-red-600 font-bold py-2.5 px-5 rounded-xl transition-all flex items-center gap-2 border border-red-100 shadow-sm"
                >
                  Clear Database
                </button>
              )}
            </div>

            <div className="bg-white rounded-[32px] p-10 shadow-xl shadow-slate-200/50 border border-slate-100">
              <div className="mb-8 flex items-start gap-5 p-6 bg-indigo-50 border border-indigo-100 rounded-2xl">
                <div className="bg-indigo-600 p-2 rounded-lg">
                  <Upload className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-black text-indigo-900">Direct Paste Import</h4>
                  <p className="text-indigo-800 text-sm font-medium mt-1 leading-relaxed">
                    Simply copy all rows from your Excel or Google Sheets (including headers) and paste them here. 
                    Our AI parses names, roles, times, and venues automatically.
                  </p>
                </div>
              </div>

              <textarea 
                className="w-full h-80 p-8 rounded-2xl border-2 border-slate-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all font-mono text-sm bg-slate-50/50 placeholder:text-slate-300"
                placeholder="Student Name	Supervisor	Ex 1	Date	Time	Venue&#10;Ahmad Ali	Dr. S	Prof. K	2024-05-12	09:00	Hall A"
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
              />

              <div className="mt-8 flex justify-center">
                <button 
                  onClick={handleDataUpload}
                  disabled={isProcessing || !rawInput.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-black py-5 px-14 rounded-2xl transition-all shadow-xl shadow-indigo-200 flex items-center gap-4 disabled:cursor-not-allowed group"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Parsing Intelligence...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-6 h-6 group-hover:scale-110 transition-transform" />
                      Save & Sync Schedule
                    </>
                  )}
                </button>
              </div>
            </div>

            {scheduleData.length > 0 && (
              <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 shadow-inner">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-black text-slate-900 text-lg">Active Database Preview</h3>
                  <span className="bg-white px-4 py-1.5 rounded-full text-xs font-black text-slate-500 border border-slate-200">{scheduleData.length} records total</span>
                </div>
                <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-400 uppercase tracking-widest font-black text-[10px]">
                        <th className="py-4 px-5">Student Candidate</th>
                        <th className="py-4 px-5">Supervisor</th>
                        <th className="py-4 px-5">Examiner</th>
                        <th className="py-4 px-5">Session Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {scheduleData.slice(0, 5).map((item) => (
                        <tr key={item.id} className="text-slate-600 hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-5 font-bold text-slate-900">{item.studentName}</td>
                          <td className="py-4 px-5">{item.supervisor}</td>
                          <td className="py-4 px-5">{item.examiner1}</td>
                          <td className="py-4 px-5">
                            <div className="flex flex-col">
                              <span className="font-bold text-indigo-600">{item.date}</span>
                              <span className="text-xs text-slate-400">{item.startTime} @ {item.location}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {scheduleData.length > 5 && (
                    <div className="p-4 bg-slate-50 text-center text-slate-400 text-xs font-bold uppercase tracking-widest border-t border-slate-100">
                      + {scheduleData.length - 5} additional sessions in memory
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-10 px-4 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-indigo-600" />
              <p className="font-black text-slate-900 tracking-tight">ScheduleHub</p>
            </div>
            <p className="text-slate-400 text-xs font-medium">Professional Academic Examination Management System</p>
          </div>
          <div className="flex flex-col items-center md:items-end gap-2">
            <div className="flex items-center gap-6">
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Efficiency through Data</span>
            </div>
            <p className="text-slate-400 text-[10px] uppercase font-bold">© 2024 — Powered by Gemini 3.0 Pro</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
