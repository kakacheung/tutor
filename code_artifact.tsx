import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Plus, 
  BookOpen, 
  ChevronLeft, 
  ChevronRight, 
  Phone, 
  LogOut, 
  Edit3, 
  Sparkles, 
  Users, 
  Search, 
  ShieldCheck, 
  GraduationCap, 
  Star, 
  Trash2, 
  X, 
  Lock, 
  KeyRound,
  RefreshCw,
  Cloud
} from 'lucide-react';

// Firebase imports
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';

// Initialize Firebase safely
const getFirebaseConfig = () => {
  if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    try {
      return JSON.parse(__firebase_config);
    } catch (e) {
      console.error("Failed to parse __firebase_config:", e);
    }
  }
  return {
    apiKey: "demo-api-key",
    authDomain: "demo-app.firebaseapp.com",
    projectId: "demo-app",
    storageBucket: "demo-app.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:demo"
  };
};

const firebaseConfig = getFirebaseConfig();
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'kaka-tutor-platform';

const DEFAULT_TUTOR_PIN = '0806';

export default function App() {
  const [user, setUser] = useState(null);
  const [isCloudConnected, setIsCloudConnected] = useState(false);
  const [role, setRole] = useState(() => localStorage.getItem('tutor_app_role') || 'parent');
  const [isTutorUnlocked, setIsTutorUnlocked] = useState(false);
  
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('tutor_app_user');
    return saved ? JSON.parse(saved) : { name: '', phone: '', isLoggedIn: false };
  });

  // Local storage backup fallback to ensure submitted data never disappears
  const [slots, setSlots] = useState(() => {
    const saved = localStorage.getItem('kaka_tutor_slots');
    return saved ? JSON.parse(saved) : [];
  });
  const [students, setStudents] = useState(() => {
    const saved = localStorage.getItem('kaka_tutor_students');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeTab, setActiveTab] = useState('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedSlotForBooking, setSelectedSlotForBooking] = useState(null);
  const [selectedSlotForProgress, setSelectedSlotForProgress] = useState(null);
  const [selectedSlotForEditTime, setSelectedSlotForEditTime] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const [authInputPhone, setAuthInputPhone] = useState('');
  const [authInputName, setAuthInputName] = useState('');

  // Save local state backup to local storage whenever changed
  useEffect(() => {
    localStorage.setItem('kaka_tutor_slots', JSON.stringify(slots));
  }, [slots]);

  useEffect(() => {
    localStorage.setItem('kaka_tutor_students', JSON.stringify(students));
  }, [students]);

  // 1. Authenticate user FIRST
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth init error, operating in local mode:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  // 2. Real-time Listeners for Cloud Firestore
  useEffect(() => {
    if (!user) return;

    let unsubSlots = () => {};
    let unsubStudents = () => {};

    try {
      // Slots Collection
      const slotsRef = collection(db, 'artifacts', appId, 'public', 'data', 'slots');
      unsubSlots = onSnapshot(slotsRef, (snapshot) => {
        const fetchedSlots = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        }));
        if (fetchedSlots.length > 0) {
          setSlots(fetchedSlots);
        }
        setIsCloudConnected(true);
      }, (err) => {
        console.warn("Firestore slots listener fallback to local state:", err);
        setIsCloudConnected(false);
      });

      // Students Collection
      const studentsRef = collection(db, 'artifacts', appId, 'public', 'data', 'students');
      unsubStudents = onSnapshot(studentsRef, (snapshot) => {
        const fetchedStudents = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        }));
        if (fetchedStudents.length > 0) {
          setStudents(fetchedStudents);
        }
      }, (err) => {
        console.warn("Firestore students listener fallback to local state:", err);
      });
    } catch (err) {
      console.warn("Firestore initialization error, using local persistence:", err);
    }

    return () => {
      unsubSlots();
      unsubStudents();
    };
  }, [user]);

  useEffect(() => {
    localStorage.setItem('tutor_app_role', role);
  }, [role]);

  useEffect(() => {
    localStorage.setItem('tutor_app_user', JSON.stringify(currentUser));
  }, [currentUser]);

  const handleSwitchRole = (targetRole) => {
    if (targetRole === 'tutor') {
      if (!isTutorUnlocked) {
        setIsPinModalOpen(true);
      } else {
        setRole('tutor');
        setActiveTab('admin_requests');
      }
    } else {
      setRole('parent');
      setActiveTab('calendar');
    }
  };

  const handleVerifyPin = (e) => {
    e.preventDefault();
    if (pinInput === DEFAULT_TUTOR_PIN) {
      setIsTutorUnlocked(true);
      setRole('tutor');
      setActiveTab('admin_requests');
      setIsPinModalOpen(false);
      setPinInput('');
      setPinError('');
    } else {
      setPinError('密碼錯誤，請重新輸入');
    }
  };

  const handleLockTutor = () => {
    setIsTutorUnlocked(false);
    setRole('parent');
    setActiveTab('calendar');
  };

  // Firestore Mutations with fallback to local state
  const handleBookSlot = async (slotId, bookingData) => {
    const updatePayload = {
      status: 'pending',
      bookedTimeSlot: bookingData.bookedTimeSlot,
      studentName: bookingData.studentName,
      parentPhone: bookingData.parentPhone || currentUser.phone,
      notes: bookingData.notes || ''
    };

    // Update local state immediately
    setSlots(prev => prev.map(s => s.id === slotId ? { ...s, ...updatePayload } : s));
    setSelectedSlotForBooking(null);

    if (user && isCloudConnected) {
      try {
        const slotRef = doc(db, 'artifacts', appId, 'public', 'data', 'slots', slotId);
        await updateDoc(slotRef, updatePayload);
      } catch (err) {
        console.error("Cloud slot booking failed, saved locally:", err);
      }
    }
  };

  const handleApproveBooking = async (slotId) => {
    setSlots(prev => prev.map(s => s.id === slotId ? { ...s, status: 'confirmed' } : s));
    if (user && isCloudConnected) {
      try {
        const slotRef = doc(db, 'artifacts', appId, 'public', 'data', 'slots', slotId);
        await updateDoc(slotRef, { status: 'confirmed' });
      } catch (err) {
        console.error("Cloud approve failed:", err);
      }
    }
  };

  const handleRejectBooking = async (slotId) => {
    const resetPayload = { 
      status: 'available', 
      bookedTimeSlot: null,
      studentName: '', 
      notes: '', 
      parentPhone: '' 
    };

    setSlots(prev => prev.map(s => s.id === slotId ? { ...s, ...resetPayload } : s));

    if (user && isCloudConnected) {
      try {
        const slotRef = doc(db, 'artifacts', appId, 'public', 'data', 'slots', slotId);
        await updateDoc(slotRef, resetPayload);
      } catch (err) {
        console.error("Cloud reject failed:", err);
      }
    }
  };

  const handleMarkCompleted = async (slotId) => {
    setSlots(prev => prev.map(s => s.id === slotId ? { ...s, status: 'completed' } : s));
    if (user && isCloudConnected) {
      try {
        const slotRef = doc(db, 'artifacts', appId, 'public', 'data', 'slots', slotId);
        await updateDoc(slotRef, { status: 'completed' });
      } catch (err) {
        console.error("Cloud mark completed failed:", err);
      }
    }
  };

  const handleUpdateSlotTime = async (slotId, newTimeSlot) => {
    setSlots(prev => prev.map(s => s.id === slotId ? { ...s, bookedTimeSlot: newTimeSlot } : s));
    setSelectedSlotForEditTime(null);

    if (user && isCloudConnected) {
      try {
        const slotRef = doc(db, 'artifacts', appId, 'public', 'data', 'slots', slotId);
        await updateDoc(slotRef, { bookedTimeSlot: newTimeSlot });
      } catch (err) {
        console.error("Cloud update time failed:", err);
      }
    }
  };

  const handleSaveProgress = async (slotId, progressData) => {
    setSlots(prev => prev.map(s => s.id === slotId ? { ...s, progress: progressData } : s));
    setSelectedSlotForProgress(null);

    if (user && isCloudConnected) {
      try {
        const slotRef = doc(db, 'artifacts', appId, 'public', 'data', 'slots', slotId);
        await updateDoc(slotRef, { progress: progressData });
      } catch (err) {
        console.error("Cloud save progress failed:", err);
      }
    }
  };

  const handleAddSlot = async (newSlot) => {
    const newSlotItem = {
      id: `slot_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      ...newSlot,
      bookedTimeSlot: null,
      status: 'available',
      studentName: '',
      parentPhone: '',
      notes: '',
      progress: null,
      createdAt: new Date().toISOString()
    };

    setSlots(prev => [...prev, newSlotItem]);

    if (user && isCloudConnected) {
      try {
        const slotsRef = collection(db, 'artifacts', appId, 'public', 'data', 'slots');
        await addDoc(slotsRef, {
          ...newSlot,
          bookedTimeSlot: null,
          status: 'available',
          studentName: '',
          parentPhone: '',
          notes: '',
          progress: null,
          createdAt: new Date().toISOString()
        });
      } catch (err) {
        console.error("Cloud add slot failed, fallback local:", err);
      }
    }
  };

  const handleDeleteSlot = async (slotId) => {
    setSlots(prev => prev.filter(s => s.id !== slotId));

    if (user && isCloudConnected) {
      try {
        const slotRef = doc(db, 'artifacts', appId, 'public', 'data', 'slots', slotId);
        await deleteDoc(slotRef);
      } catch (err) {
        console.error("Cloud delete slot failed:", err);
      }
    }
  };

  const handleAddStudent = async (studentData) => {
    const newStudent = {
      id: `student_${Date.now()}`,
      ...studentData,
      createdAt: new Date().toISOString()
    };

    setStudents(prev => [...prev, newStudent]);

    if (user && isCloudConnected) {
      try {
        const studentsRef = collection(db, 'artifacts', appId, 'public', 'data', 'students');
        await addDoc(studentsRef, {
          ...studentData,
          createdAt: new Date().toISOString()
        });
      } catch (err) {
        console.error("Cloud add student failed:", err);
      }
    }
  };

  const handleDeleteStudent = async (studentId) => {
    setStudents(prev => prev.filter(s => s.id !== studentId));

    if (user && isCloudConnected) {
      try {
        const studentRef = doc(db, 'artifacts', appId, 'public', 'data', 'students', studentId);
        await deleteDoc(studentRef);
      } catch (err) {
        console.error("Cloud delete student failed:", err);
      }
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (!authInputPhone) return;
    setCurrentUser({
      name: authInputName || `家長 (${authInputPhone.slice(-4)})`,
      phone: authInputPhone,
      isLoggedIn: true
    });
    setIsAuthModalOpen(false);
  };

  const handleGoogleLoginSim = () => {
    setCurrentUser({
      name: '家長 (Google 帳號)',
      phone: '91234567',
      isLoggedIn: true
    });
    setIsAuthModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-md">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-bold text-lg text-slate-900 leading-tight">家嘉老師私補平台</h1>
                {isCloudConnected ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200" title="雲端同步中">
                    <Cloud className="w-3 h-3 mr-1 text-emerald-600" />
                    雲端連線
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                    本機儲存中
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">課堂預約 & 學習進度追蹤</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
              <button
                onClick={() => handleSwitchRole('parent')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  role === 'parent' 
                    ? 'bg-white text-indigo-700 shadow-sm font-semibold' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                家長 / 學生介面
              </button>
              <button
                onClick={() => handleSwitchRole('tutor')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1 ${
                  role === 'tutor' 
                    ? 'bg-indigo-600 text-white shadow-sm font-semibold' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {!isTutorUnlocked && <Lock className="w-3 h-3 text-slate-400" />}
                <span>導師後台</span>
              </button>
            </div>

            {role === 'tutor' && isTutorUnlocked && (
              <button
                onClick={handleLockTutor}
                className="p-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-xl transition border border-slate-200"
                title="鎖定並退出後台"
              >
                <Lock className="w-4 h-4" />
              </button>
            )}

            {role === 'parent' && (
              <div>
                {currentUser.isLoggedIn ? (
                  <div className="flex items-center space-x-2 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl">
                    <User className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-medium text-indigo-900">{currentUser.name}</span>
                    <button 
                      onClick={() => setCurrentUser({ name: '', phone: '', isLoggedIn: false })}
                      className="text-slate-400 hover:text-rose-500 ml-1"
                      title="登出"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-3 py-1.5 rounded-xl transition"
                  >
                    登入 / 註冊
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 flex flex-col gap-6">
        <div className={`p-4 rounded-2xl flex items-center justify-between border ${
          role === 'tutor' 
            ? 'bg-indigo-900 text-white border-indigo-800' 
            : 'bg-gradient-to-r from-sky-50 to-indigo-50 border-indigo-100 text-slate-800'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl ${role === 'tutor' ? 'bg-indigo-800' : 'bg-white shadow-sm text-indigo-600'}`}>
              {role === 'tutor' ? <ShieldCheck className="w-5 h-5 text-indigo-200" /> : <Sparkles className="w-5 h-5" />}
            </div>
            <div>
              <div className="font-semibold text-sm">
                {role === 'tutor' ? '導師管理模式 (已受 PIN 碼保護)' : '家長預約與學習主頁'}
              </div>
              <p className={`text-xs mt-0.5 ${role === 'tutor' ? 'text-indigo-200' : 'text-slate-500'}`}>
                {role === 'tutor' 
                  ? '您可以開放靈活的空檔時間（如 12:00-17:00）、審批家長自選的補習時段，所有變更將即時儲存。' 
                  : '直接選擇導師開放的大時段，自由挑選理想的開始與結束時間提交預約！'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 overflow-x-auto">
          {role === 'parent' ? (
            <>
              <TabButton 
                active={activeTab === 'calendar'} 
                onClick={() => setActiveTab('calendar')}
                icon={<CalendarIcon className="w-4 h-4" />}
                label="預約可補習時段"
              />
              <TabButton 
                active={activeTab === 'progress'} 
                onClick={() => setActiveTab('progress')}
                icon={<BookOpen className="w-4 h-4" />}
                label="子女上課進度 & 功課"
                badge={slots.filter(s => s.progress && (currentUser.phone === s.parentPhone || !currentUser.phone)).length}
              />
            </>
          ) : (
            <>
              <TabButton 
                active={activeTab === 'admin_requests'} 
                onClick={() => setActiveTab('admin_requests')}
                icon={<AlertCircle className="w-4 h-4" />}
                label="預約審批管理"
                badge={slots.filter(s => s.status === 'pending').length}
              />
              <TabButton 
                active={activeTab === 'admin_slots'} 
                onClick={() => setActiveTab('admin_slots')}
                icon={<CalendarIcon className="w-4 h-4" />}
                label="設定開放空檔"
              />
              <TabButton 
                active={activeTab === 'progress'} 
                onClick={() => setActiveTab('progress')}
                icon={<Edit3 className="w-4 h-4" />}
                label="填寫與查看學生進度"
              />
              <TabButton 
                active={activeTab === 'students'} 
                onClick={() => setActiveTab('students')}
                icon={<Users className="w-4 h-4" />}
                label="學生名冊"
              />
            </>
          )}
        </div>

        {activeTab === 'calendar' && (
          <CalendarBookingView 
            slots={slots} 
            role={role} 
            onSelectSlot={(slot) => setSelectedSlotForBooking(slot)}
            currentMonth={currentMonth}
            setCurrentMonth={setCurrentMonth}
          />
        )}

        {activeTab === 'progress' && (
          <ProgressTrackerView 
            slots={slots} 
            role={role} 
            currentUser={currentUser}
            onOpenWriteProgress={(slot) => setSelectedSlotForProgress(slot)}
          />
        )}

        {activeTab === 'admin_requests' && role === 'tutor' && (
          <AdminRequestsView 
            slots={slots} 
            onApprove={handleApproveBooking} 
            onReject={handleRejectBooking}
            onComplete={handleMarkCompleted}
            onOpenWriteProgress={(slot) => setSelectedSlotForProgress(slot)}
            onEditTime={(slot) => setSelectedSlotForEditTime(slot)}
            onDelete={handleDeleteSlot}
          />
        )}

        {activeTab === 'admin_slots' && role === 'tutor' && (
          <AdminSlotsManagementView 
            slots={slots} 
            onAddSlot={handleAddSlot} 
            onDeleteSlot={handleDeleteSlot}
          />
        )}

        {activeTab === 'students' && role === 'tutor' && (
          <StudentsListView 
            students={students} 
            onAddStudent={handleAddStudent}
            onDeleteStudent={handleDeleteStudent}
          />
        )}
      </main>

      {selectedSlotForBooking && (
        <BookingModal 
          slot={selectedSlotForBooking} 
          currentUser={currentUser}
          students={students}
          onClose={() => setSelectedSlotForBooking(null)}
          onSubmit={handleBookSlot}
        />
      )}

      {selectedSlotForProgress && (
        <ProgressModal 
          slot={selectedSlotForProgress} 
          onClose={() => setSelectedSlotForProgress(null)}
          onSave={handleSaveProgress}
        />
      )}

      {selectedSlotForEditTime && (
        <EditTimeModal 
          slot={selectedSlotForEditTime}
          onClose={() => setSelectedSlotForEditTime(null)}
          onSave={handleUpdateSlotTime}
        />
      )}

      {isPinModalOpen && (
        <TutorPinModal 
          onClose={() => {
            setIsPinModalOpen(false);
            setPinInput('');
            setPinError('');
          }}
          onSubmit={handleVerifyPin}
          pin={pinInput}
          setPin={setPinInput}
          error={pinError}
        />
      )}

      {isAuthModalOpen && (
        <AuthModal 
          onClose={() => setIsAuthModalOpen(false)}
          onSubmit={handleLogin}
          onGoogleLogin={handleGoogleLoginSim}
          phone={authInputPhone}
          setPhone={setAuthInputPhone}
          name={authInputName}
          setName={setAuthInputName}
        />
      )}

      <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-center text-xs text-slate-400">
        <p>© 2026 家嘉老師私補平台 - 即時儲存與課堂管理</p>
      </footer>
    </div>
  );
}

function TabButton({ active, onClick, icon, label, badge }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap ${
        active 
          ? 'bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-sm' 
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      {icon}
      <span>{label}</span>
      {badge > 0 && (
        <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1">
          {badge}
        </span>
      )}
    </button>
  );
}

function CalendarBookingView({ slots, role, onSelectSlot, currentMonth, setCurrentMonth }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const slotsByDate = useMemo(() => {
    const map = {};
    slots.forEach(slot => {
      if (!map[slot.date]) map[slot.date] = [];
      map[slot.date].push(slot);
    });
    return map;
  }, [slots]);

  const selectedDateSlots = slotsByDate[selectedDate] || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
            <CalendarIcon className="w-5 h-5 text-indigo-600" />
            <span>{year} 年 {month + 1} 月</span>
          </h2>
          <div className="flex space-x-1">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-400 mb-2">
          <div>日</div><div>一</div><div>二</div><div>三</div><div>四</div><div>五</div><div>六</div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDayIndex }).map((_, idx) => (
            <div key={`empty-${idx}`} className="h-20 bg-slate-50/50 rounded-xl" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const daySlots = slotsByDate[formattedDate] || [];
            const isSelected = selectedDate === formattedDate;
            const hasAvailable = daySlots.some(s => s.status === 'available');

            return (
              <div
                key={formattedDate}
                onClick={() => setSelectedDate(formattedDate)}
                className={`h-20 p-1.5 rounded-xl border flex flex-col justify-between cursor-pointer transition relative ${
                  isSelected 
                    ? 'border-indigo-600 bg-indigo-50/30 shadow-sm' 
                    : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className={`text-xs font-semibold ${isSelected ? 'text-indigo-600 font-bold' : 'text-slate-700'}`}>
                    {dayNum}
                  </span>
                  {hasAvailable && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500" title="有可預約空檔"></span>
                  )}
                </div>

                <div className="space-y-1">
                  {daySlots.slice(0, 2).map((s) => (
                    <div 
                      key={s.id} 
                      className={`text-[10px] px-1.5 py-0.5 rounded truncate font-medium ${
                        s.status === 'available' ? 'bg-emerald-100 text-emerald-800' :
                        s.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {s.status === 'available' ? `${s.windowStart}-${s.windowEnd}` : s.bookedTimeSlot}
                    </div>
                  ))}
                  {daySlots.length > 2 && (
                    <div className="text-[9px] text-slate-400 font-medium">+{daySlots.length - 2} 個時段</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col">
        <h3 className="font-bold text-slate-800 text-base mb-1">
          {selectedDate} 的開放空檔
        </h3>
        <p className="text-xs text-slate-500 mb-4">點擊綠色空檔可在該範圍內自由自訂補習時間</p>

        <div className="flex-1 space-y-3 overflow-y-auto">
          {selectedDateSlots.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              當日暫無開放空檔
            </div>
          ) : (
            selectedDateSlots.map((slot) => (
              <div
                key={slot.id}
                className={`p-4 rounded-xl border transition ${
                  slot.status === 'available'
                    ? 'border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50'
                    : slot.status === 'pending'
                    ? 'border-amber-200 bg-amber-50/30'
                    : 'border-slate-200 bg-slate-50 opacity-80'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2 text-slate-800 font-semibold text-sm">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span>
                      {slot.status === 'available' 
                        ? `可選範圍：${slot.windowStart} - ${slot.windowEnd}`
                        : `預約時段：${slot.bookedTimeSlot}`
                      }
                    </span>
                  </div>

                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                    slot.status === 'available' ? 'bg-emerald-100 text-emerald-800' :
                    slot.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                    slot.status === 'confirmed' ? 'bg-indigo-100 text-indigo-800' :
                    'bg-slate-200 text-slate-700'
                  }`}>
                    {slot.status === 'available' && '可預約'}
                    {slot.status === 'pending' && '待導師確認'}
                    {slot.status === 'confirmed' && '已成功預約'}
                    {slot.status === 'completed' && '已完成'}
                  </span>
                </div>

                {slot.status === 'available' ? (
                  <button
                    onClick={() => onSelectSlot(slot)}
                    className="w-full mt-2 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center justify-center space-x-1"
                  >
                    <Plus className="w-4 h-4" />
                    <span>自訂時間預約</span>
                  </button>
                ) : (
                  <div className="mt-2 text-xs text-slate-600 space-y-1 bg-white p-2.5 rounded-lg border border-slate-100">
                    <p><span className="font-semibold text-slate-700">學生：</span>{slot.studentName || '未指定'}</p>
                    {slot.notes && <p className="text-slate-500 italic">備註："{slot.notes}"</p>}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ProgressTrackerView({ slots, role, currentUser, onOpenWriteProgress }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSlots = slots.filter(slot => {
    const hasProgressOrConfirmed = slot.progress || slot.status === 'confirmed' || slot.status === 'completed';
    if (!hasProgressOrConfirmed) return false;

    if (role === 'parent' && currentUser.phone) {
      if (slot.parentPhone && slot.parentPhone !== currentUser.phone) return false;
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        slot.studentName?.toLowerCase().includes(term) ||
        slot.progress?.topic?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200">
        <div>
          <h2 className="font-bold text-slate-800 text-lg">學習進度與功課紀錄</h2>
          <p className="text-xs text-slate-500">檢視每堂課的上課摘要、派發功課及老師評語</p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input 
            type="text" 
            placeholder="搜尋學生名稱/課題..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSlots.length === 0 ? (
          <div className="col-span-2 text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
            目前沒有相關的課堂進度紀錄
          </div>
        ) : (
          filteredSlots.map(slot => (
            <div key={slot.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 text-base">{slot.studentName || '學生'}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 flex items-center space-x-1">
                      <CalendarIcon className="w-3.5 h-3.5" />
                      <span>{slot.date} ({slot.bookedTimeSlot})</span>
                    </p>
                  </div>

                  {role === 'tutor' && (
                    <button
                      onClick={() => onOpenWriteProgress(slot)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1 transition"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{slot.progress ? '修改進度' : '填寫進度'}</span>
                    </button>
                  )}
                </div>

                {slot.progress ? (
                  <div className="mt-3 space-y-3 text-xs text-slate-700">
                    <div>
                      <span className="font-bold text-indigo-900 block mb-0.5">📘 本堂教學課題：</span>
                      <p className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-slate-800 font-medium">
                        {slot.progress.topic}
                      </p>
                    </div>

                    <div>
                      <span className="font-bold text-slate-800 block mb-0.5">📝 學習內容摘要：</span>
                      <p className="text-slate-600 leading-relaxed">{slot.progress.content}</p>
                    </div>

                    {slot.progress.homework && (
                      <div className="bg-amber-50/60 border border-amber-100 p-2.5 rounded-xl">
                        <span className="font-bold text-amber-900 block mb-0.5">📌 功課安排：</span>
                        <p className="text-amber-800">{slot.progress.homework}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="font-bold text-slate-700">課堂表現評分：</span>
                      <div className="flex space-x-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-4 h-4 ${i < slot.progress.performance ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} 
                          />
                        ))}
                      </div>
                    </div>

                    {slot.progress.tutorComment && (
                      <div className="bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100 italic text-indigo-950">
                        <span className="font-semibold not-italic text-indigo-900">💬 家嘉老師評語：</span>
                        "{slot.progress.tutorComment}"
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 p-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
                    導師尚未填寫此課堂的進度摘要
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function AdminRequestsView({ slots, onApprove, onReject, onComplete, onOpenWriteProgress, onEditTime, onDelete }) {
  const pendingSlots = slots.filter(s => s.status === 'pending');
  const confirmedSlots = slots.filter(s => s.status === 'confirmed');

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <h2 className="font-bold text-slate-900 text-base flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-amber-500" />
          <span>待審批的預約申請 ({pendingSlots.length})</span>
        </h2>

        {pendingSlots.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">目前沒有等待處理的家長預約</p>
        ) : (
          <div className="space-y-3">
            {pendingSlots.map((slot) => (
              <div key={slot.id} className="p-4 rounded-xl border border-amber-200 bg-amber-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 text-sm">{slot.studentName}</span>
                  </div>
                  <p className="text-slate-600">日期：{slot.date}</p>
                  <p className="text-indigo-700 font-semibold">家長申請時段：{slot.bookedTimeSlot} (開放範圍: {slot.windowStart}-{slot.windowEnd})</p>
                  <p className="text-slate-600">家長電話：{slot.parentPhone}</p>
                  {slot.notes && <p className="text-slate-500 italic">家長備註：{slot.notes}</p>}
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => onApprove(slot.id)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shadow-sm transition"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>批准預約</span>
                  </button>
                  <button
                    onClick={() => onReject(slot.id)}
                    className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg text-xs font-semibold flex items-center space-x-1 transition"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>拒絕</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <h2 className="font-bold text-slate-900 text-base flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-indigo-600" />
          <span>已確認的課堂 ({confirmedSlots.length})</span>
        </h2>

        {confirmedSlots.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">暫無已確認課堂</p>
        ) : (
          <div className="space-y-3">
            {confirmedSlots.map((slot) => (
              <div key={slot.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 text-sm">{slot.studentName}</span>
                  </div>
                  <p className="text-slate-600">日期：{slot.date}</p>
                  <p className="text-indigo-700 font-semibold">補習時段：{slot.bookedTimeSlot}</p>
                  {slot.parentPhone && <p className="text-slate-500">家長電話：{slot.parentPhone}</p>}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => onOpenWriteProgress(slot)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shadow-sm transition"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>撰寫進度</span>
                  </button>
                  <button
                    onClick={() => onEditTime(slot)}
                    className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-medium transition flex items-center space-x-1"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>更改時間</span>
                  </button>
                  <button
                    onClick={() => onComplete(slot.id)}
                    className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition"
                  >
                    完成
                  </button>
                  <button
                    onClick={() => onDelete(slot.id)}
                    className="p-1.5 hover:bg-rose-100 text-rose-600 rounded-lg transition"
                    title="刪除課堂"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AdminSlotsManagementView({ slots, onAddSlot, onDeleteSlot }) {
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [windowStart, setWindowStart] = useState('12:00');
  const [windowEnd, setWindowEnd] = useState('17:00');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newDate || !windowStart || !windowEnd) return;
    onAddSlot({
      date: newDate,
      windowStart,
      windowEnd
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
          <Plus className="w-5 h-5 text-indigo-600" />
          <span>開放可補習長時段</span>
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">選擇日期</label>
            <input 
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">最早開放時間</label>
              <input 
                type="time"
                value={windowStart}
                onChange={(e) => setWindowStart(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">最晚結束時間</label>
              <input 
                type="time"
                value={windowEnd}
                onChange={(e) => setWindowEnd(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-normal">
            💡 家長可在您設定的（例如 {windowStart} 至 {windowEnd}）時間範圍內自由選擇具體的起止時間。
          </p>

          <button
            type="submit"
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-sm transition"
          >
            發布開放時段
          </button>
        </form>
      </div>

      <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-base">現有可預約時段清單</h3>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {slots.filter(s => s.status === 'available').length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">目前沒有任何開放預約的時段</p>
          ) : (
            slots.filter(s => s.status === 'available').map(slot => (
              <div key={slot.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-3">
                  <CalendarIcon className="w-4 h-4 text-indigo-600" />
                  <span className="font-semibold text-slate-800">{slot.date}</span>
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-medium">
                    可選範圍：{slot.windowStart} - {slot.windowEnd}
                  </span>
                </div>

                <button
                  onClick={() => onDeleteSlot(slot.id)}
                  className="p-1.5 hover:bg-rose-100 text-rose-600 rounded-lg transition"
                  title="刪除時段"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StudentsListView({ students, onAddStudent, onDeleteStudent }) {
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !phone) return;
    onAddStudent({
      name,
      grade: grade || '小學',
      parentPhone: phone
    });
    setName('');
    setGrade('');
    setPhone('');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-base">新增學生名冊</h3>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">學生姓名</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="例如：黃小華" 
              className="w-full p-2 border border-slate-200 rounded-xl"
              required 
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">年級</label>
            <input 
              type="text" 
              value={grade} 
              onChange={e => setGrade(e.target.value)} 
              placeholder="例如：中四" 
              className="w-full p-2 border border-slate-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">家長聯絡電話</label>
            <input 
              type="text" 
              value={phone} 
              onChange={e => setPhone(e.target.value)} 
              placeholder="例如：98765432" 
              className="w-full p-2 border border-slate-200 rounded-xl"
              required 
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-sm"
          >
            建立學生檔案
          </button>
        </form>
      </div>

      <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-base">學生名錄 ({students.length})</h3>

        {students.length === 0 ? (
          <p className="text-xs text-slate-400 py-8 text-center">暫無學生紀錄，請在左側表單新增。</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {students.map(s => (
              <div key={s.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs relative group">
                <div className="flex justify-between items-center pr-6">
                  <span className="font-bold text-slate-900 text-sm">{s.name}</span>
                  <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded">{s.grade}</span>
                </div>
                <p className="text-slate-600 flex items-center space-x-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>家長電話：{s.parentPhone}</span>
                </p>
                <button
                  onClick={() => onDeleteStudent(s.id)}
                  className="absolute top-3 right-3 p-1 text-slate-400 hover:text-rose-600 rounded transition"
                  title="刪除學生"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EditTimeModal({ slot, onClose, onSave }) {
  const [startTime, setStartTime] = useState(slot.bookedTimeSlot ? slot.bookedTimeSlot.split(' - ')[0] : '14:00');
  const [endTime, setEndTime] = useState(slot.bookedTimeSlot ? slot.bookedTimeSlot.split(' - ')[1] : '15:30');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!startTime || !endTime) return;
    onSave(slot.id, `${startTime} - ${endTime}`);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4 relative">
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>

        <h3 className="font-bold text-slate-900 text-base">更改補習時間</h3>
        <p className="text-xs text-slate-500">學生：{slot.studentName} | 日期：{slot.date}</p>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">開始時間</label>
              <input 
                type="time" 
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-xl"
                required
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">結束時間</label>
              <input 
                type="time" 
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-xl"
                required
              />
            </div>
          </div>

          <div className="flex space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-sm"
            >
              更新時間
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BookingModal({ slot, currentUser, students, onClose, onSubmit }) {
  const [studentName, setStudentName] = useState(students[0]?.name || '');
  const [parentPhone, setParentPhone] = useState(currentUser.phone || '');
  const [startTime, setStartTime] = useState(slot.windowStart || '14:00');
  const [endTime, setEndTime] = useState('15:15');
  const [notes, setNotes] = useState('');
  const [timeError, setTimeError] = useState('');

  const durationText = useMemo(() => {
    if (!startTime || !endTime) return '';
    const [sH, sM] = startTime.split(':').map(Number);
    const [eH, eM] = endTime.split(':').map(Number);
    const startMins = sH * 60 + sM;
    const endMins = eH * 60 + eM;
    const diff = endMins - startMins;

    if (diff <= 0) return '結束時間必須晚於開始時間';
    const hrs = Math.floor(diff / 60);
    const mins = diff % 60;
    let str = '';
    if (hrs > 0) str += `${hrs} 小時 `;
    if (mins > 0) str += `${mins} 分鐘`;
    return `補習總時長：${str}`;
  }, [startTime, endTime]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!startTime || !endTime) return;

    if (startTime < slot.windowStart || endTime > slot.windowEnd) {
      setTimeError(`選擇時間超出了導師開放範圍 (${slot.windowStart} - ${slot.windowEnd})`);
      return;
    }
    if (startTime >= endTime) {
      setTimeError('結束時間必須晚於開始時間');
      return;
    }

    onSubmit(slot.id, {
      bookedTimeSlot: `${startTime} - ${endTime}`,
      studentName,
      parentPhone,
      notes
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 relative">
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>

        <h3 className="font-bold text-slate-900 text-lg">預約補習時間</h3>

        <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl text-xs space-y-1">
          <p><span className="font-bold text-indigo-900">預約日期：</span>{slot.date}</p>
          <p><span className="font-bold text-indigo-900">導師開放範圍：</span>{slot.windowStart} 至 {slot.windowEnd}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2">
            <label className="block text-slate-800 font-bold">自訂補習起止時間：</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-500 block mb-1">開始時間</span>
                <input 
                  type="time" 
                  value={startTime}
                  onChange={e => { setStartTime(e.target.value); setTimeError(''); }}
                  className="w-full p-2 border border-slate-300 rounded-lg text-slate-800 font-medium"
                  required
                />
              </div>
              <div>
                <span className="text-slate-500 block mb-1">結束時間</span>
                <input 
                  type="time" 
                  value={endTime}
                  onChange={e => { setEndTime(e.target.value); setTimeError(''); }}
                  className="w-full p-2 border border-slate-300 rounded-lg text-slate-800 font-medium"
                  required
                />
              </div>
            </div>
            {durationText && (
              <p className="text-indigo-600 font-semibold text-[11px] pt-1">{durationText}</p>
            )}
            {timeError && (
              <p className="text-rose-500 font-semibold text-[11px]">{timeError}</p>
            )}
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">學生名稱</label>
            <input 
              type="text"
              value={studentName}
              onChange={e => setStudentName(e.target.value)}
              placeholder="輸入學生姓名"
              className="w-full p-2.5 border border-slate-200 rounded-xl"
              required
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">家長聯絡電話</label>
            <input 
              type="text"
              value={parentPhone}
              onChange={e => setParentPhone(e.target.value)}
              placeholder="電話號碼"
              className="w-full p-2.5 border border-slate-200 rounded-xl"
              required
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">課堂要求 / 備忘 (選填)</label>
            <textarea 
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="例如：希望重點溫習代數公式"
              className="w-full p-2.5 border border-slate-200 rounded-xl h-16"
            />
          </div>

          <div className="flex space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-sm"
            >
              提交預約
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProgressModal({ slot, onClose, onSave }) {
  const [topic, setTopic] = useState(slot.progress?.topic || '');
  const [content, setContent] = useState(slot.progress?.content || '');
  const [homework, setHomework] = useState(slot.progress?.homework || '');
  const [performance, setPerformance] = useState(slot.progress?.performance || 5);
  const [tutorComment, setTutorComment] = useState(slot.progress?.tutorComment || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(slot.id, {
      topic,
      content,
      homework,
      performance: Number(performance),
      tutorComment
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>

        <h3 className="font-bold text-slate-900 text-lg">撰寫課堂學習進度</h3>
        <p className="text-xs text-slate-500">學生：{slot.studentName} | {slot.date} ({slot.bookedTimeSlot})</p>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">今日教學課題</label>
            <input 
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="例如：Chapter 4 因式分解"
              className="w-full p-2.5 border border-slate-200 rounded-xl"
              required
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">教學內容摘要</label>
            <textarea 
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="詳細記錄今日教授的概念與練習"
              className="w-full p-2.5 border border-slate-200 rounded-xl h-24"
              required
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">派發功課安排</label>
            <input 
              type="text"
              value={homework}
              onChange={e => setHomework(e.target.value)}
              placeholder="例如：完成工作紙 P.18 (1-10題)"
              className="w-full p-2.5 border border-slate-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">課堂表現評分 (1 - 5 星)</label>
            <div className="flex space-x-2 items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setPerformance(star)}
                  className="p-1"
                >
                  <Star className={`w-6 h-6 ${star <= performance ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">家嘉老師評語 / 給家長的建議</label>
            <textarea 
              value={tutorComment}
              onChange={e => setTutorComment(e.target.value)}
              placeholder="例如：今天概念理解良好，多加注意計算細節即可"
              className="w-full p-2.5 border border-slate-200 rounded-xl h-20"
            />
          </div>

          <div className="flex space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-sm"
            >
              儲存進度記錄
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TutorPinModal({ onClose, onSubmit, pin, setPin, error }) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xs w-full p-6 shadow-2xl space-y-4 relative text-center">
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <KeyRound className="w-6 h-6" />
        </div>

        <div>
          <h3 className="font-bold text-slate-900 text-base">導師後台安全解鎖</h3>
          <p className="text-xs text-slate-500 mt-1">請輸入 4 位數 PIN 碼進入管理系統</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <input 
              type="password"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              className="w-full text-center text-2xl tracking-[0.5em] py-2 border-2 border-slate-200 rounded-xl focus:border-indigo-600 focus:outline-none"
              autoFocus
              required
            />
            {error && <p className="text-[11px] text-rose-500 font-semibold mt-2">{error}</p>}
          </div>

          <div className="flex space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              解鎖進入
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AuthModal({ onClose, onSubmit, onGoogleLogin, phone, setPhone, name, setName }) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-5 relative">
        <button onClick={onClose} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <h3 className="font-bold text-slate-900 text-lg">家長 / 學生快速登入</h3>
          <p className="text-xs text-slate-500 mt-1">方便查閱專屬補習進度與預約</p>
        </div>

        <button
          onClick={onGoogleLogin}
          className="w-full py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold text-xs flex items-center justify-center space-x-2 transition shadow-sm"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          <span>以 Google 帳號一鍵登入</span>
        </button>

        <div className="flex items-center space-x-2 text-slate-300 text-xs">
          <div className="flex-1 h-px bg-slate-200"></div>
          <span>或使用電話登入</span>
          <div className="flex-1 h-px bg-slate-200"></div>
        </div>

        <form onSubmit={onSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">您的稱呼 (選填)</label>
            <input 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="例如：陳太"
              className="w-full p-2.5 border border-slate-200 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">香港電話號碼</label>
            <input 
              type="text" 
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="例如：91234567"
              className="w-full p-2.5 border border-slate-200 rounded-xl"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-sm transition"
          >
            登入平台
          </button>
        </form>
      </div>
    </div>
  );
}