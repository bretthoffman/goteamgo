"use client";
// @ts-nocheck

import { useEffect, useState } from "react";
import {
  Calendar,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
  Check,
  Mail,
  LogOut,
  User,
  XCircle,
} from "lucide-react";
// Simple storage shim:
// - Uses localStorage when available
// - Falls back to in-memory store (works even if storage is "disabled")
const DEFAULT_ADMIN_PASSWORD = "admin123";
const memoryStore = new Map<string, string>();
const DEFAULT_REQUESTS: any[] = [];
const DEFAULT_CREW_MEMBERS: string[] = ["Brian Bethea", "Carson Brunson"];
const storage = {
  // NOTE: second arg is accepted for backwards-compat (ignored)
  async get(key: string, _json?: boolean) {
    const FORCE_MEMORY_ONLY = false;

    try {
      if (!FORCE_MEMORY_ONLY && typeof window !== "undefined" && window.localStorage) {
        const value = window.localStorage.getItem(key);
        return value !== null ? { value } : null;
      }
    } catch {
      // ignore and fall back to memory
    }

    const memVal = memoryStore.get(key);
    return memVal !== undefined ? { value: memVal } : null;
  },

  // NOTE: third arg is accepted for backwards-compat (ignored)
  async set(key: string, value: string, _json?: boolean) {
    const FORCE_MEMORY_ONLY = true;

    try {
      if (!FORCE_MEMORY_ONLY && typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, value);
        return true;
      }
    } catch {
      // ignore and fall back to memory
    }

    memoryStore.set(key, value);
    return true;
  },
};
const DEFAULT_EVENTS_SEED = [
  {
    id: "event_seed_1",
    title: "Sample Event (Seed)",
    client: "Sage",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
    timeSlots: [{ callTime: "08:00", start: "09:00", end: "17:00" }],
    dailyHours: [{ day: 0, hours: 8 }],
    location: "Studio A",
    description: "",
    positions: [
      { role: "Audio Engineer", count: 1, description: "Mix live sound and manage microphones.", filled: 0, staff: [] },
    ],
    sageCrew: [{ name: "Brian Bethea", role: "Stage Manager" }],
  },
];
export default function ProductionStaffingPortal() {
  const [view, setView] = useState('contractor-login');
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [isContractorAuth, setIsContractorAuth] = useState(false);
  const [adminPwd, setAdminPwd] = useState('');
  const [showPwdErr, setShowPwdErr] = useState(false);
  const [events, setEvents] = useState<any[]>(DEFAULT_EVENTS_SEED);
  const [requests, setRequests] = useState<any[]>(DEFAULT_REQUESTS);
  const [cName, setCName] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cFullRate, setCFullRate] = useState('');
  const [cHalfRate, setCHalfRate] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPwd, setLoginPwd] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPwd, setRegPwd] = useState('');
  const [regFullRate, setRegFullRate] = useState('');
  const [regHalfRate, setRegHalfRate] = useState('');
  const [showReg, setShowReg] = useState(false);
  const [showCLoginErr, setShowCLoginErr] = useState(false);
  const [showForgotPwd, setShowForgotPwd] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [recoveredPwd, setRecoveredPwd] = useState('');
  const [loading, setLoading] = useState(true);
  const [newEvent, setNewEvent] = useState({ 
    title: '', 
    startDate: '', 
    endDate: '', 
    timeSlots: [{ callTime: '', start: '', end: '' }], 
    dailyHours: [{ day: 0, hours: 0 }], 
    location: '', 
    client: '', 
    description: '', 
    positions: [] as Array<{role: string; count: number; description: string; filled: number; staff: Array<{name: string; email: string; dayRate: number; totalHours: number; rateType: string; approvedAt: string}>}>,
    sageCrew: [] as Array<{name: string, role: string}>
  });
  const [curPos, setCurPos] = useState({ role: '', count: 0, description: '' });
  const [curSageMember, setCurSageMember] = useState({ name: '', role: '' });
  const [sageCrewMembers, setSageCrewMembers] = useState<string[]>(DEFAULT_CREW_MEMBERS);
  const [showAddCrewMember, setShowAddCrewMember] = useState(false);
  const [newCrewMemberName, setNewCrewMemberName] = useState('');
  const [editingEventId, setEditingEventId] = useState(null);
  const [showCreateEventPanel, setShowCreateEventPanel] = useState(false);

  const roles = [
    { name: 'Zoom Op', desc: 'Operate PTZ cameras and manage zoom controls.' },
    { name: 'Audio Engineer', desc: 'Mix live sound and manage microphones.' },
    { name: 'Video Switcher', desc: 'Operate video switcher and manage feeds.' },
    { name: 'Roaming Cam', desc: 'Operate handheld camera for coverage.' },
    { name: 'Stage Manager', desc: 'Coordinate talent and crew flow.' },
    { name: 'Extra Crew', desc: 'Additional production support.' }
  ];

  const mapDbEventRowToUiEvent = (row: any) => {
    const base = row.event_json && typeof row.event_json === 'object' ? row.event_json : {};
    const id = base.id || row.id;
    const startDate =
      base.startDate ||
      row.start_date ||
      new Date().toISOString().split('T')[0];

    return {
      ...base,
      id,
      title: base.title || row.title || 'Untitled',
      client: base.client || row.client || '',
      startDate,
      endDate: base.endDate || row.end_date || '',
      location: base.location || row.location || '',
    };
  };

  const mapDbRequestRowToUiRequest = (row: any) => {
    const base = row.payload && typeof row.payload === 'object' ? row.payload : {};
    return {
      ...base,
      id: base.id || row.id,
      eventId: base.eventId || row.event_id,
      contractorEmail: base.contractorEmail || row.contractor_email,
      status: base.status || row.status || 'pending',
      requestedAt: base.requestedAt || row.requested_at,
    };
  };
  

  useEffect(() => {
    init();
  }, []);
  
  const init = async () => {
    setLoading(true);

    try {
      // Load events from Supabase
      try {
        const res = await fetch('/api/production/events');
        const data = await res.json().catch(() => null);
        if (res.ok && data?.events) {
          const mapped = data.events
            .map((row: any) => mapDbEventRowToUiEvent(row))
            .sort((a: any, b: any) => +new Date(a.startDate) - +new Date(b.startDate));
          setEvents(mapped);
        } else {
          setEvents(DEFAULT_EVENTS_SEED);
        }
      } catch (error) {
        console.error('Error loading events from Supabase:', error);
        setEvents(DEFAULT_EVENTS_SEED);
      }

      // Load requests from Supabase
      try {
        const resReq = await fetch('/api/production/requests');
        const dataReq = await resReq.json().catch(() => null);
        if (resReq.ok && dataReq?.requests) {
          const mappedReqs = dataReq.requests
            .map((row: any) => mapDbRequestRowToUiRequest(row))
            .sort((a: any,b: any) => +new Date(b.requestedAt) - +new Date(a.requestedAt));
          setRequests(mappedReqs);
        } else {
          setRequests(DEFAULT_REQUESTS);
        }
      } catch (error) {
        console.error('Error loading requests from Supabase:', error);
        setRequests(DEFAULT_REQUESTS);
      }

      // Load crew members from storage (unchanged)
      const crewRes = await storage.get('sage:crew_members');
      if (crewRes?.value) {
        setSageCrewMembers(JSON.parse(crewRes.value));
      } else {
        setSageCrewMembers(DEFAULT_CREW_MEMBERS);
        await storage.set("sage:crew_members", JSON.stringify(DEFAULT_CREW_MEMBERS));
      }
    } catch (error) {
      console.error('Error initializing:', error);
      setEvents(DEFAULT_EVENTS_SEED);
      setRequests(DEFAULT_REQUESTS);
      setSageCrewMembers(DEFAULT_CREW_MEMBERS);
    } finally {
      setLoading(false);
    }
  };

  const handleCLogin = async () => {
    if (!loginEmail || !loginPwd) { 
      alert('⚠️ Enter email and password'); 
      return; 
    }
    try {
      const res = await fetch('/api/production/contractors/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPwd }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setShowCLoginErr(true);
        setTimeout(() => setShowCLoginErr(false), 3000);
        return;
      }

      const contractor = data.contractor || {};

      setCName(contractor.name || '');
      setCEmail(contractor.email || '');
      setCFullRate(
        contractor.full_day_rate != null
          ? String(contractor.full_day_rate)
          : ''
      );
      setCHalfRate(
        contractor.half_day_rate != null
          ? String(contractor.half_day_rate)
          : ''
      );

      setIsContractorAuth(true);
      setView('contractor');
      setLoginEmail(''); 
      setLoginPwd('');
    } catch (error) { 
      setShowCLoginErr(true); 
      setTimeout(() => setShowCLoginErr(false), 3000); 
    }
  };

  const handleCReg = async () => {
    if (!regName || !regEmail || !regPwd || !regFullRate || !regHalfRate) { alert('⚠️ Fill all fields'); return; }
    if (!regEmail.includes('@')) { alert('⚠️ Valid email needed'); return; }
    if (regPwd.length < 4) { alert('⚠️ Password min 4 chars'); return; }

    try {
      const res = await fetch('/api/production/contractors/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          password: regPwd,
          fullDayRate: regFullRate,
          halfDayRate: regHalfRate,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        alert(`❌ Failed to create account: ${data?.error ?? 'Unknown error'}`);
        return;
      }

      alert('✅ Account created!');
      setShowReg(false);
      setRegName('');
      setRegEmail('');
      setRegPwd('');
      setRegFullRate('');
      setRegHalfRate('');
    } catch (err: any) {
      alert(`❌ Failed to create account: ${err?.message ?? String(err)}`);
    }
  };

  const handleForgotPwd = async () => {
    alert('Password reset is not automated yet. Please contact an admin to reset your password.');
  };

  const handleALogin = async () => {
    try {
      const r = await storage.get("sage:admin_password");
      const storedPwd = r?.value || DEFAULT_ADMIN_PASSWORD;
  
      if (adminPwd === storedPwd) {
        setIsAdminAuth(true);
        setShowPwdErr(false);
        setAdminPwd("");
        setView("admin");
      } else {
        setShowPwdErr(true);
        setTimeout(() => setShowPwdErr(false), 3000);
      }
    } catch {
      // even if storage fails, still allow default
      if (adminPwd === DEFAULT_ADMIN_PASSWORD) {
        setIsAdminAuth(true);
        setShowPwdErr(false);
        setAdminPwd("");
        setView("admin");
      } else {
        setShowPwdErr(true);
        setTimeout(() => setShowPwdErr(false), 3000);
      }
    }
  };

  const loadEvents = async () => { 
    try { 
      const res = await fetch('/api/production/events');
      const data = await res.json().catch(() => null);
      if (res.ok && data?.events) {
        const mapped = data.events
          .map((row: any) => mapDbEventRowToUiEvent(row))
          .sort((a: any,b: any) => +new Date(a.startDate) - +new Date(b.startDate));
        setEvents(mapped);
      } else {
        setEvents([]);
      }
    } catch (error) { 
      console.error('loadEvents error:', error);
      setEvents([]); 
    } 
  };
  
  const saveEvents = async (list: any[]) => { 
    try { 
      // Upsert each event, then reload from server for a canonical view
      for (const ev of list) {
        await fetch('/api/production/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ev),
        });
      }
      await loadEvents();
    } catch (error) { 
      console.error('Save error:', error);
      throw error; 
    } 
  };
  
  const loadReqs = async () => { 
    try { 
      const res = await fetch('/api/production/requests');
      const data = await res.json().catch(() => null);
      if (res.ok && data?.requests) {
        const mapped = data.requests
          .map((row: any) => mapDbRequestRowToUiRequest(row))
          .sort((a: any, b: any) => +new Date(b.requestedAt) - +new Date(a.requestedAt));
        setRequests(mapped);
      } else {
        setRequests([]);
      }
    } catch (error) { 
      console.error('loadReqs error:', error);
      setRequests([]); 
    } 
  };
  
  const saveReqs = async (list: any[]) => { 
    try { 
      // Upsert each request, then reload from server
      for (const r of list) {
        await fetch('/api/production/requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(r),
        });
      }
      await loadReqs();
    } catch (error) { 
      console.error('Save error:', error);
      throw error; 
    } 
  };

  const loadCrewMembers = async () => {
    try {
      const r = await storage.get('sage:crew_members');
      if (r?.value) setSageCrewMembers(JSON.parse(r.value));
      else setSageCrewMembers(['Brian Bethea', 'Carson Brunson']);
    } catch (error) {
      setSageCrewMembers(['Brian Bethea', 'Carson Brunson']);
    }
  };

  const saveCrewMembers = async (list: any[]) => {
    try {
      await storage.set('sage:crew_members', JSON.stringify(list));
      setSageCrewMembers(list);
    } catch (error) {
      console.error('Save error:', error);
      throw error;
    }
  };

  const addCrewMember = async () => {
    if (!newCrewMemberName.trim()) {
      alert('⚠️ Enter crew member name');
      return;
    }
    if (sageCrewMembers.includes(newCrewMemberName.trim())) {
      alert('⚠️ Crew member already exists');
      return;
    }
    try {
      const updated = [...sageCrewMembers, newCrewMemberName.trim()];
      await saveCrewMembers(updated);
      setNewCrewMemberName('');
      setShowAddCrewMember(false);
      alert('✅ Crew member added!');
    } catch {
      alert('❌ Failed to add crew member');
    }
  };

  const removeCrewMember = async (name: string) => {
    if (!confirm(`⚠️ Remove ${name} from Sage Crew?`)) return;
    try {
      const updated = sageCrewMembers.filter(m => m !== name);
      await saveCrewMembers(updated);
      alert('✅ Removed!');
    } catch {
      alert('❌ Failed');
    }
  };

  const createEvent = async () => {
    // For new events, let Supabase generate the UUID id.
    // For edits, reuse the existing id from the DB-backed event.
    const eventId = editingEventId || null;
    const data = { 
      ...newEvent, 
      ...(eventId ? { id: eventId } : {}), 
      title: newEvent.title || 'Untitled', 
      startDate: newEvent.startDate || new Date().toISOString().split('T')[0], 
      timeSlots: newEvent.timeSlots.length ? newEvent.timeSlots : [{ callTime: '', start: '', end: '' }], 
      dailyHours: newEvent.dailyHours || [{ day: 0, hours: 0 }], 
      positions: newEvent.positions,
      sageCrew: newEvent.sageCrew || []
    };
    try {
      await fetch('/api/production/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      await loadEvents();
      setNewEvent({ 
        title: '', 
        startDate: '', 
        endDate: '', 
        timeSlots: [{ callTime: '', start: '', end: '' }], 
        dailyHours: [{ day: 0, hours: 0 }], 
        location: '', 
        client: '', 
        description: '', 
        positions: [],
        sageCrew: []
      });
      setEditingEventId(null);
      alert(editingEventId ? '✅ Event updated!' : '✅ Event created!');
    } catch { alert('❌ Failed to save'); }
  };

  const editEvent = (event: any) => {
    setNewEvent(event);
    setEditingEventId(event.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setNewEvent({ 
      title: '', 
      startDate: '', 
      endDate: '', 
      timeSlots: [{ callTime: '', start: '', end: '' }], 
      dailyHours: [{ day: 0, hours: 0 }], 
      location: '', 
      client: '', 
      description: '', 
      positions: [],
      sageCrew: []
    });
    setEditingEventId(null);
  };

  const reqPos = async (event: any, idx: number) => {
    if (!cName || !cEmail) { alert('⚠️ Enter name/email'); return; }
    if (!cFullRate || parseFloat(cFullRate) <= 0) { alert('⚠️ Enter rates'); return; }
    const pos = event.positions[idx];
    if (requests.find(r => r.eventId === event.id && r.positionIndex === idx && r.contractorEmail === cEmail)) { alert('⚠️ Already requested'); return; }
    if (pos.filled >= pos.count) { alert('⚠️ Fully staffed'); return; }
    
    const totalHrs = event.dailyHours ? 
      event.dailyHours.reduce((s: number, d: any) => s + (parseFloat(d.hours) || 0), 0) : 
      event.timeSlots.reduce((s: number, slot: any) => { 
        if (slot.start && slot.end) { 
          const st = new Date(`2000-01-01T${slot.start}`); 
          const en = new Date(`2000-01-01T${slot.end}`); 
          return s + ((en.getTime() - st.getTime()) / 3600000); 
        } 
        return s; 
      }, 0);
    
    // Calculate pay based on number of days
    let rate = 0;
    let rateType = '';
    
    if (event.dailyHours && event.dailyHours.length > 0) {
      // Multi-day event with daily breakdown
      const days = event.dailyHours.filter((d: any) => d.hours > 0);
      let fullDays = 0;
      let halfDays = 0;
      
      days.forEach((d: any) => {
        if (d.hours <= 5) {
          halfDays++;
        } else {
          fullDays++;
        }
      });
      
      rate = (fullDays * parseFloat(cFullRate)) + (halfDays * parseFloat(cHalfRate));
      rateType = `${fullDays} Full Day${fullDays !== 1 ? 's' : ''}, ${halfDays} Half Day${halfDays !== 1 ? 's' : ''}`;
    } else {
      // Single day or time slots
      const isHalfDay = totalHrs <= 5;
      rate = isHalfDay ? parseFloat(cHalfRate) : parseFloat(cFullRate);
      rateType = isHalfDay ? 'Half Day' : 'Full Day';
    }
    
    const reqData = { 
      // id will be generated by Supabase; we don't send a client-generated id for new requests
      eventId: event.id, 
      eventTitle: event.title, 
      eventStartDate: event.startDate, 
      eventEndDate: event.endDate, 
      eventTimeSlots: event.timeSlots, 
      eventDailyHours: event.dailyHours, 
      eventLocation: event.location, 
      totalHours: totalHrs, 
      rateType: rateType, 
      positionIndex: idx, 
      positionRole: pos.role, 
      contractorName: cName, 
      contractorEmail: cEmail, 
      contractorDayRate: rate, 
      contractorFullRate: parseFloat(cFullRate), 
      contractorHalfRate: parseFloat(cHalfRate), 
      status: 'pending', 
      requestedAt: new Date().toISOString() 
    };
    try {
      const res = await fetch('/api/production/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqData),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        alert(`❌ Failed: ${data?.error ?? 'Unknown error'}`);
        return;
      }
      const mapped = mapDbRequestRowToUiRequest(data.request);
      setRequests(prev => [mapped, ...prev]);
      alert('✅ Submitted!');
    }
    catch { alert('❌ Failed'); }
  };

  const approve = async (req: any) => {
    const updReq = { ...req, status: 'approved' };
    try {
      // Persist request status change
      await fetch('/api/production/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updReq),
      });
      const updReqs = requests.map(r => r.id === req.id ? updReq : r);
      setRequests(updReqs);

      const eIdx = events.findIndex(e => e.id === req.eventId);
      if (eIdx !== -1) {
        const updEvts = [...events];
        const pos = updEvts[eIdx].positions[req.positionIndex];
        pos.staff = pos.staff || [];
        pos.staff.push({ name: req.contractorName, email: req.contractorEmail, dayRate: req.contractorDayRate, totalHours: req.totalHours, rateType: req.rateType, approvedAt: new Date().toISOString() });
        pos.filled = pos.staff.length;
        // Also reflect approved contractor in Sage Crew section for this event
        const currentCrew = Array.isArray(updEvts[eIdx].sageCrew) ? updEvts[eIdx].sageCrew : [];
        updEvts[eIdx].sageCrew = [
          ...currentCrew,
          { name: req.contractorName, role: req.positionRole },
        ];
        // Persist the single updated event
        await fetch('/api/production/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updEvts[eIdx]),
        });
        setEvents(updEvts);
      }
      alert('✅ Approved!');
    } catch { alert('❌ Failed'); }
  };

  const reject = async (req: any) => {
    try {
      const updReq = { ...req, status: 'rejected' };
      await fetch('/api/production/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updReq),
      });
      setRequests(requests.map(r => r.id === req.id ? updReq : r));
      alert('✅ Rejected');
    } catch {
      alert('❌ Failed');
    }
  };

  const delEvent = async (id: string) => {
    if (!confirm('⚠️ Delete event?')) return;
    try {
      await fetch(`/api/production/events/${id}`, { method: 'DELETE' });
      await loadEvents();
      alert('✅ Deleted!');
    } catch {
      alert('❌ Failed');
    }
  };

  const pending = requests.filter(r => r.status === 'pending');
  const myReqs = requests.filter(r => r.contractorEmail === cEmail);

  if (loading) return <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6" style={{ color: "#111" }}>
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="text-center mb-6">
            <svg width="150" height="85" viewBox="0 0 300 169" className="mx-auto mb-2" fill="#14b8a6" xmlns="http://www.w3.org/2000/svg"><g transform="translate(0,169) scale(0.1,-0.1)"><path d="M1924 1156 c-30 -14 -68 -44 -95 -75 l-45 -51 -204 -50 c-232 -57 -260 -60 -260 -29 0 11 5 30 11 42 7 11 13 40 15 64 2 41 1 43 -31 49 -37 7 -116 -8 -173 -32 -42 -18 -495 -134 -523 -134 -17 0 -17 2 -2 37 27 65 2 150 -52 175 -29 13 -82 -2 -240 -72 -60 -26 -158 -63 -217 -82 -101 -31 -108 -35 -108 -59 l0 -27 73 23 c40 12 130 47 200 78 132 59 245 94 272 83 21 -8 19 -71 -5 -124 l-19 -43 -53 6 c-29 4 -79 13 -111 21 -33 8 -63 12 -68 8 -11 -6 -12 -74 -1 -90 27 -42 106 -44 187 -6 44 21 82 30 143 35 67 5 238 43 375 83 16 5 17 1 12 -29 -5 -27 -2 -39 17 -62 36 -42 98 -41 168 3 53 33 80 36 80 8 0 -36 94 -27 300 29 146 40 216 53 207 38 -12 -20 15 -72 48 -93 40 -25 58 -25 114 0 24 11 46 19 48 17 2 -2 -5 -25 -16 -51 -13 -29 -45 -69 -86 -107 -196 -184 -331 -463 -282 -582 29 -68 87 -59 147 25 58 79 150 283 204 448 l53 165 69 37 c70 37 279 112 345 123 31 6 40 2 70 -28 23 -23 50 -38 75 -43 49 -9 180 9 321 45 96 24 108 29 111 50 3 20 1 23 -15 16 -48 -19 -253 -66 -312 -71 -52 -4 -73 -2 -101 13 -53 27 -45 43 35 65 92 25 135 58 135 102 0 45 -26 66 -80 66 -82 0 -180 -71 -195 -141 -5 -22 -13 -28 -43 -33 -63 -12 -254 -77 -324 -111 -38 -18 -68 -30 -68 -26 0 23 27 80 51 108 28 32 45 85 34 103 -4 6 4 10 19 10 22 0 26 4 26 30 0 27 -6 34 -42 50 -59 27 -131 25 -194 -4z m170 -35 c4 -6 -133 -51 -158 -51 -14 0 7 22 38 41 32 19 110 26 120 10z m593 -6 c7 -22 -25 -47 -91 -71 -38 -13 -71 -22 -75 -19 -12 12 26 60 64 82 40 23 95 27 102 8z m-1387 -65 c12 -8 9 -15 -18 -43 -65 -67 -202 -114 -202 -69 1 35 52 79 122 103 61 21 77 22 98 9z m745 -40 c-27 -54 -82 -93 -146 -105 -56 -10 -81 24 -60 80 6 15 32 27 97 47 49 14 99 27 112 27 l22 1 -25 -50z m-1604 -121 c-34 -28 -101 -23 -101 6 0 18 11 21 72 16 l52 -3 -23 -19z m1454 -285 c-32 -144 -56 -210 -109 -308 -55 -101 -88 -138 -119 -134 -52 7 -29 140 56 311 48 98 72 134 124 185 35 36 66 62 68 60 3 -3 -6 -54 -20 -114z"/></g></svg>
            <h1 className="text-2xl font-bold text-gray-800">Production Staffing Portal</h1>
            <p className="text-gray-600">Request positions and manage crew</p>
          </div>
          <div className="flex gap-4 flex-wrap justify-center">
            {!isContractorAuth && <button onClick={() => setView('contractor-login')} className={`px-6 py-2 rounded-lg font-medium ${view==='contractor-login'?'bg-blue-600 text-white':'bg-gray-200 text-gray-700'}`}>Contractor Login</button>}
            {isContractorAuth && (<><button onClick={() => setView('contractor')} className={`px-6 py-2 rounded-lg font-medium ${view==='contractor'?'bg-blue-600 text-white':'bg-gray-200 text-gray-700'}`}>Events</button><button onClick={() => setView('my-requests')} className={`px-6 py-2 rounded-lg font-medium ${view==='my-requests'?'bg-blue-600 text-white':'bg-gray-200 text-gray-700'}`}>My Requests ({myReqs.length})</button><button onClick={() => {setIsContractorAuth(false);setCName('');setCEmail('');setCFullRate('');setCHalfRate('');setView('contractor-login');}} className="px-6 py-2 rounded-lg font-medium bg-gray-600 text-white flex items-center gap-2"><LogOut className="w-4 h-4"/>Logout</button></>)}
            <button onClick={() => {if(!isAdminAuth) setView('admin-login'); else setView('admin');}} className={`px-6 py-2 rounded-lg font-medium ${view==='admin'||view==='admin-login'?'bg-blue-600 text-white':'bg-gray-200 text-gray-700'}`}>Admin</button>
            {isAdminAuth && view==='admin' && <button onClick={() => {setIsAdminAuth(false);setView('contractor-login');}} className="px-6 py-2 rounded-lg font-medium bg-red-600 text-white">Logout</button>}
          </div>
          {view==='admin' && pending.length>0 && <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800 flex items-center gap-2 justify-center"><Mail className="w-4 h-4"/><span>{pending.length} pending</span></div>}
        </div>

        {view==='contractor-login' && (
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-center flex items-center justify-center gap-2"><User className="w-6 h-6"/>Contractor Portal</h2>
            {!showReg && !showForgotPwd ? (
              <div className="space-y-4">
                <div><label className="block text-sm font-medium mb-2">Email</label><input type="email" className="w-full px-4 py-2 border rounded-lg" value={loginEmail} onChange={(e)=>setLoginEmail(e.target.value)}/></div>
                <div><label className="block text-sm font-medium mb-2">Password</label><input type="password" className="w-full px-4 py-2 border rounded-lg" value={loginPwd} onChange={(e)=>setLoginPwd(e.target.value)} onKeyPress={(e)=>e.key==='Enter'&&handleCLogin()}/></div>
                {showCLoginErr && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4"/><span>Invalid credentials</span></div>}
                <button onClick={handleCLogin} className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Login</button>
                <div className="flex justify-between items-center pt-2">
                  <button onClick={()=>setShowForgotPwd(true)} className="text-sm text-blue-600 hover:text-blue-700">Forgot Password?</button>
                </div>
                <div className="text-center pt-4 border-t"><button onClick={()=>setShowReg(true)} className="text-blue-600 hover:text-blue-700 font-medium">Create Account</button></div>
              </div>
            ) : showForgotPwd ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700">Forgot Password</h3>
                <p className="text-sm text-gray-600">Enter your email to retrieve your password.</p>
                <div><label className="block text-sm font-medium mb-2">Email</label><input type="email" placeholder="your@email.com" className="w-full px-4 py-2 border rounded-lg" value={forgotEmail} onChange={(e)=>setForgotEmail(e.target.value)} onKeyPress={(e)=>e.key==='Enter'&&handleForgotPwd()}/></div>
                {recoveredPwd && (
                  <div className="bg-green-50 border border-green-400 rounded-lg p-4">
                    <p className="text-sm font-semibold text-green-800 mb-2">✅ Password Found!</p>
                    <p className="text-sm text-gray-700">Your password is:</p>
                    <p className="text-lg font-bold text-gray-900 mt-2 bg-white px-4 py-2 rounded border border-gray-300">{recoveredPwd}</p>
                  </div>
                )}
                <button onClick={handleForgotPwd} className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Retrieve Password</button>
                <div className="text-center pt-4 border-t"><button onClick={()=>{setShowForgotPwd(false);setForgotEmail('');setRecoveredPwd('');}} className="text-blue-600">← Back to Login</button></div>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-700">Create Account</h3>
                <div><label className="block text-sm font-medium mb-2">Name</label><input type="text" className="w-full px-4 py-2 border rounded-lg" value={regName} onChange={(e)=>setRegName(e.target.value)}/></div>
                <div><label className="block text-sm font-medium mb-2">Email</label><input type="email" className="w-full px-4 py-2 border rounded-lg" value={regEmail} onChange={(e)=>setRegEmail(e.target.value)}/></div>
                <div><label className="block text-sm font-medium mb-2">Password</label><input type="password" className="w-full px-4 py-2 border rounded-lg" value={regPwd} onChange={(e)=>setRegPwd(e.target.value)}/></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium mb-2">Full Day Rate ($)</label><input type="number" placeholder="800" className="w-full px-4 py-2 border rounded-lg" value={regFullRate} onChange={(e)=>setRegFullRate(e.target.value)}/></div>
                  <div><label className="block text-sm font-medium mb-2">Half Day Rate ($)</label><input type="number" placeholder="400" className="w-full px-4 py-2 border rounded-lg" value={regHalfRate} onChange={(e)=>setRegHalfRate(e.target.value)}/></div>
                </div>
                <p className="text-xs text-gray-500">Half day = 5 hours or less. Full day = more than 5 hours.</p>
                <button onClick={handleCReg} className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700">Create</button>
                <div className="text-center pt-4 border-t"><button onClick={()=>setShowReg(false)} className="text-blue-600">← Back</button></div>
              </div>
            )}
          </div>
        )}

        {view==='admin-login' && (
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-center">Admin Login</h2>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium mb-2">Password</label><input type="password" className="w-full px-4 py-2 border rounded-lg" value={adminPwd} onChange={(e)=>setAdminPwd(e.target.value)} onKeyPress={(e)=>e.key==='Enter'&&handleALogin()}/></div>
              {showPwdErr && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm"><AlertCircle className="w-4 h-4 inline mr-2"/>Incorrect password</div>}
              <button onClick={handleALogin} className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Login</button>
            </div>
          </div>
        )}

        {view==='admin' && isAdminAuth && (
          <div className="space-y-6">
            {/* Manage Sage Crew Members */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Manage Sage Crew</h2>
                <button 
                  onClick={() => setShowAddCrewMember(!showAddCrewMember)} 
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm"
                >
                  + Add Crew Member
                </button>
              </div>
              
              {showAddCrewMember && (
                <div className="mb-4 p-4 bg-teal-50 border border-teal-200 rounded-lg">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter crew member name"
                      className="flex-1 px-4 py-2 border rounded-lg"
                      value={newCrewMemberName}
                      onChange={(e) => setNewCrewMemberName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addCrewMember()}
                    />
                    <button 
                      onClick={addCrewMember} 
                      className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                    >
                      Add
                    </button>
                    <button 
                      onClick={() => {setShowAddCrewMember(false); setNewCrewMemberName('');}} 
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sageCrewMembers.map((member, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-teal-50 border border-teal-200 p-3 rounded-lg">
                    <span className="font-medium text-teal-800">{member}</span>
                    <button 
                      onClick={() => removeCrewMember(member)} 
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
              {sageCrewMembers.length === 0 && (
                <p className="text-gray-500 text-center py-4">No crew members yet</p>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <button
                type="button"
                onClick={() => setShowCreateEventPanel((v) => !v)}
                className="w-full flex items-center justify-between mb-1 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-gray-300 text-gray-600 text-xs">
                    {showCreateEventPanel ? '▾' : '▸'}
                  </span>
                  <h2 className="text-xl font-bold">
                    {editingEventId ? 'Edit Event' : 'Create Event'}
                  </h2>
                </div>
                {editingEventId && (
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); cancelEdit(); }}
                    className="px-4 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs border border-gray-300"
                  >
                    Cancel Edit
                  </button>
                )}
              </button>
              {showCreateEventPanel && (
              <div className="mt-4 space-y-4">
                <input type="text" placeholder="Event Title" className="w-full px-4 py-2 border rounded-lg" value={newEvent.title} onChange={(e)=>setNewEvent({...newEvent,title:e.target.value})}/>
                <input type="text" placeholder="Client" className="w-full px-4 py-2 border rounded-lg" value={newEvent.client} onChange={(e)=>setNewEvent({...newEvent,client:e.target.value})}/>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium mb-1">Start Date</label><input type="date" className="w-full px-4 py-2 border rounded-lg" value={newEvent.startDate} onChange={(e)=>setNewEvent({...newEvent,startDate:e.target.value})}/></div>
                  <div><label className="block text-sm font-medium mb-1">End Date (optional)</label><input type="date" className="w-full px-4 py-2 border rounded-lg" value={newEvent.endDate} onChange={(e)=>setNewEvent({...newEvent,endDate:e.target.value})} min={newEvent.startDate}/></div>
                </div>
                <select className="w-full px-4 py-2 border rounded-lg" value={newEvent.location} onChange={(e)=>setNewEvent({...newEvent,location:e.target.value})}><option value="">Select Studio</option><option value="Studio A">Studio A</option><option value="Studio B">Studio B</option><option value="Studio C">Studio C</option></select>
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Time Slots</h3>
                  {newEvent.timeSlots.map((slot,i)=>(
                    <div key={i} className="grid grid-cols-3 gap-2 mb-2">
                      <div><label className="text-xs font-semibold text-red-600">CALL TIME</label><input type="time" className="w-full px-3 py-2 border-2 border-red-300 rounded-lg bg-red-50" value={slot.callTime} onChange={(e)=>{const u=[...newEvent.timeSlots];u[i].callTime=e.target.value;setNewEvent({...newEvent,timeSlots:u});}}/></div>
                      <div><label className="text-xs">Start</label><input type="time" className="w-full px-3 py-2 border rounded-lg" value={slot.start} onChange={(e)=>{const u=[...newEvent.timeSlots];u[i].start=e.target.value;setNewEvent({...newEvent,timeSlots:u});}}/></div>
                      <div><label className="text-xs">End</label><input type="time" className="w-full px-3 py-2 border rounded-lg" value={slot.end} onChange={(e)=>{const u=[...newEvent.timeSlots];u[i].end=e.target.value;setNewEvent({...newEvent,timeSlots:u});}}/></div>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Daily Hours Breakdown</h3>
                  <p className="text-sm text-gray-600 mb-3">For multi-day events, specify hours per day</p>
                  {(newEvent.dailyHours || [{day:0,hours:0}]).map((dh,i)=>(
                    <div key={i} className="grid grid-cols-3 gap-2 mb-2">
                      <div><label className="text-xs">Day</label><input type="number" min="0" placeholder="0" className="w-full px-3 py-2 border rounded-lg" value={dh.day} onChange={(e)=>{const u=[...newEvent.dailyHours];u[i].day=parseInt(e.target.value)||0;setNewEvent({...newEvent,dailyHours:u});}}/></div>
                      <div><label className="text-xs">Hours</label><input type="number" min="0" step="0.5" placeholder="8" className="w-full px-3 py-2 border rounded-lg" value={dh.hours} onChange={(e)=>{const u=[...newEvent.dailyHours];u[i].hours=parseFloat(e.target.value)||0;setNewEvent({...newEvent,dailyHours:u});}}/></div>
                      <button onClick={()=>{if(newEvent.dailyHours.length>1){const u=newEvent.dailyHours.filter((_,idx)=>idx!==i);setNewEvent({...newEvent,dailyHours:u});}}} className="px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 mt-5">Remove</button>
                    </div>
                  ))}
                  <button onClick={()=>setNewEvent({...newEvent,dailyHours:[...(newEvent.dailyHours||[{day:0,hours:0}]),{day:(newEvent.dailyHours?.length||0),hours:0}]})} className="text-sm text-blue-600 hover:text-blue-800">+ Add Day</button>
                </div>
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Sage Crew (Full-Time Staff)</h3>
                  <p className="text-sm text-gray-600 mb-3">Add Sage crew members assigned to this event</p>
                  <div className="grid grid-cols-12 gap-2">
                    <select className="col-span-5 px-4 py-2 border rounded-lg" value={curSageMember.name} onChange={(e)=>setCurSageMember({...curSageMember,name:e.target.value})}><option value="">Select Crew Member</option>{sageCrewMembers.map(m=><option key={m} value={m}>{m}</option>)}</select>
                    <select className="col-span-5 px-4 py-2 border rounded-lg" value={curSageMember.role} onChange={(e)=>setCurSageMember({...curSageMember,role:e.target.value})}><option value="">Select Role</option>{roles.map(r=><option key={r.name} value={r.name}>{r.name}</option>)}</select>
                    <button onClick={()=>{if(curSageMember.name&&curSageMember.role){setNewEvent({...newEvent,sageCrew:[...(newEvent.sageCrew||[]),{...curSageMember}]});setCurSageMember({name:'',role:''});}}} className="col-span-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm">Add</button>
                  </div>
                  {newEvent.sageCrew && newEvent.sageCrew.length>0 && <div className="mt-4 space-y-2">{newEvent.sageCrew.map((m: any,i: number)=><div key={i} className="flex justify-between bg-teal-50 border border-teal-200 p-3 rounded"><span className="font-medium text-teal-800">{m.name} - {m.role}</span><button onClick={()=>setNewEvent({...newEvent,sageCrew:newEvent.sageCrew.filter((_: any,idx: number)=>idx!==i)})} className="text-red-600"><X className="w-5 h-5"/></button></div>)}</div>}
                </div>
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Contractor Positions</h3>
                  <p className="text-sm text-gray-600 mb-3">Open positions for contractor requests</p>
                  <div className="grid grid-cols-12 gap-2">
                    <select className="col-span-6 px-4 py-2 border rounded-lg" value={curPos.role} onChange={(e)=>{const t=roles.find(r=>r.name===e.target.value);setCurPos({...curPos,role:e.target.value,description:t?t.desc:''});}}><option value="">Select Role</option>{roles.map(r=><option key={r.name} value={r.name}>{r.name}</option>)}</select>
                    <input type="number" placeholder="Count" className="col-span-2 px-4 py-2 border rounded-lg" value={curPos.count||''} onChange={(e)=>setCurPos({...curPos,count:parseInt(e.target.value)||0})}/>
                    <button onClick={()=>{if(curPos.role&&curPos.count>0){setNewEvent({...newEvent,positions:[...newEvent.positions,{...curPos,filled:0,staff:[]}]});setCurPos({role:'',count:0,description:''});}}} className="col-span-4 px-4 py-2 bg-blue-600 text-white rounded-lg">Add</button>
                  </div>
                  {newEvent.positions.length>0 && <div className="mt-4 space-y-2">{newEvent.positions.map((p: any,i: number)=><div key={i} className="flex justify-between bg-gray-50 p-3 rounded"><span>{p.role} ({p.count})</span><button onClick={()=>setNewEvent({...newEvent,positions:newEvent.positions.filter((_: any,idx: number)=>idx!==i)})} className="text-red-600"><X className="w-5 h-5"/></button></div>)}</div>}
                </div>
                <button onClick={createEvent} className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                  {editingEventId ? 'Update Event' : 'Create Event'}
                </button>
              </div>
              )}
            </div>

            {pending.length>0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold mb-4">Pending Requests ({pending.length})</h2>
                <div className="space-y-3">{pending.map(r=>(
                  <div key={r.id} className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div><h3 className="font-semibold">{r.eventTitle}</h3><p className="text-sm text-gray-600">{r.positionRole} - {r.contractorName}</p><p className="text-sm text-gray-600">{r.contractorEmail}</p><p className="text-sm text-gray-600">Total Hours: {r.totalHours?.toFixed(1)} ({r.rateType})</p><p className="text-sm font-semibold text-green-700">${r.contractorDayRate} ({r.rateType})</p></div>
                      <div className="flex gap-2"><button onClick={()=>approve(r)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center gap-1"><Check className="w-4 h-4"/>Approve</button><button onClick={()=>reject(r)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm flex items-center gap-1"><X className="w-4 h-4"/>Reject</button></div>
                    </div>
                  </div>
                ))}</div>
              </div>
            )}

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4">All Events ({events.length})</h2>
              {events.length===0?<p className="text-gray-500 text-center py-8">No events</p>:<div className="space-y-3">{events.map(e=><div key={e.id} className="border rounded-lg p-4"><div className="flex justify-between"><div><h3 className="font-bold">{e.title}</h3><p className="text-sm text-gray-600">{e.startDate}{e.endDate ? ` - ${e.endDate}`:''} | {e.location}</p>{e.dailyHours && e.dailyHours.length>0 && <div className="text-xs text-gray-600 mt-1">{e.dailyHours.map((dh: any,i: number)=><span key={i}>Day {dh.day}: {dh.hours}hrs {i<e.dailyHours.length-1 && '| '}</span>)}</div>}
              {e.sageCrew && e.sageCrew.length>0 && <div className="mt-2 bg-teal-50 border border-teal-200 rounded p-2"><p className="text-xs font-semibold text-teal-800 mb-1">Sage Crew:</p><div className="text-xs text-teal-700">{e.sageCrew.map((m: any,i: number)=><span key={i} className="inline-block bg-white px-2 py-1 rounded mr-1 mb-1">{m.name} ({m.role})</span>)}</div></div>}
              {e.positions && e.positions.length>0 && <div className="mt-2 text-xs text-gray-600">Positions: {e.positions.map((p: any,i: number)=><span key={i}>{p.role} ({p.filled}/{p.count}){i<e.positions.length-1 && ', '}</span>)}</div>}
              </div><div className="flex gap-2"><button onClick={()=>editEvent(e)} className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200">Edit</button><button onClick={()=>delEvent(e.id)} className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200">Delete</button></div></div></div>)}</div>}
            </div>
          </div>
        )}

        {view==='contractor' && isContractorAuth && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-lg p-4">
              <p className="text-sm text-gray-700"><strong>Your Rates:</strong> Full Day: ${cFullRate} | Half Day: ${cHalfRate}</p>
            </div>
            {events.filter(e=>new Date(e.startDate)>=new Date(new Date().setHours(0,0,0,0))).length===0?<div className="bg-white rounded-lg shadow-lg p-12 text-center"><Calendar className="w-16 h-16 mx-auto text-gray-400 mb-4"/><p className="text-gray-600">No upcoming events</p></div>:events.filter(e=>new Date(e.startDate)>=new Date(new Date().setHours(0,0,0,0))).map(e=>{
              const totalHrs=e.dailyHours?e.dailyHours.reduce((s: number,d: any)=>s+(parseFloat(d.hours)||0),0):e.timeSlots.reduce((s: number,slot: any)=>{if(slot.start&&slot.end){const st=new Date(`2000-01-01T${slot.start}`);const en=new Date(`2000-01-01T${slot.end}`);return s+((en.getTime() - st.getTime()) / 3600000);}return s;},0);
              
              // Calculate pay based on number of days
              let estPay = 0;
              let rateBreakdown = '';
              
              if (e.dailyHours && e.dailyHours.length > 0) {
                // Multi-day event with daily breakdown
                const days = e.dailyHours.filter((d: any) => d.hours > 0);
                let fullDays = 0;
                let halfDays = 0;
                
                days.forEach((d: any) => {
                  if (d.hours <= 5) {
                    halfDays++;
                  } else {
                    fullDays++;
                  }
                });
                
                estPay = (fullDays * parseFloat(cFullRate)) + (halfDays * parseFloat(cHalfRate));
                rateBreakdown = `${fullDays} full day${fullDays !== 1 ? 's' : ''}, ${halfDays} half day${halfDays !== 1 ? 's' : ''}`;
              } else {
                // Single day or time slots
                const isHalf = totalHrs <= 5;
                estPay = isHalf ? parseFloat(cHalfRate) : parseFloat(cFullRate);
                rateBreakdown = isHalf ? 'Half Day' : 'Full Day';
              }
              
              return <div key={e.id} className="bg-white rounded-lg shadow-lg p-6"><h3 className="text-2xl font-bold">{e.title}</h3><p className="text-gray-600">{e.client} - {e.startDate}{e.endDate?` to ${e.endDate}`:''}</p><p className="text-sm text-teal-600 font-medium mt-1">{totalHrs.toFixed(1)} hrs total ({rateBreakdown}) - Est. Pay: ${estPay.toFixed(2)}</p>{e.dailyHours&&e.dailyHours.length>0&&<div className="text-sm text-gray-600 mt-2">Daily breakdown: {e.dailyHours.map((dh: any,i: number)=><span key={i}>Day {dh.day}: {dh.hours}hrs{i<e.dailyHours.length-1&&' | '}</span>)}</div>}
              {e.sageCrew && e.sageCrew.length>0 && <div className="mt-3 bg-teal-50 border border-teal-200 rounded-lg p-3"><p className="text-sm font-semibold text-teal-800 mb-2">Sage Crew Assigned:</p><div className="flex flex-wrap gap-2">{e.sageCrew.map((m: any,i: number)=><span key={i} className="bg-white px-3 py-1 rounded-full text-sm text-teal-700 border border-teal-300">{m.name} - {m.role}</span>)}</div></div>}
              <div className="mt-4"><h4 className="font-semibold mb-2">Positions</h4>{e.positions.map((p: any,i: number)=>{const avail=p.count-p.filled;const myReq=requests.find(r=>r.eventId===e.id&&r.positionIndex===i&&r.contractorEmail===cEmail);return(<div key={i} className="bg-gray-50 rounded-lg p-4 mb-2"><div className="flex justify-between"><div><h5 className="font-medium">{p.role}</h5><p className="text-sm text-gray-600">{avail} of {p.count} available</p></div><div>{myReq?<span className={`px-4 py-2 rounded-lg text-sm ${myReq.status==='pending'?'bg-yellow-200 text-yellow-800':myReq.status==='approved'?'bg-green-200 text-green-800':'bg-red-200 text-red-800'}`}>{myReq.status==='pending'&&'⏳ Pending'}{myReq.status==='approved'&&'✅ Approved'}{myReq.status==='rejected'&&'❌ Rejected'}</span>:avail>0?<button onClick={()=>reqPos(e,i)} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Request</button>:<span className="px-4 py-2 bg-gray-300 text-gray-600 rounded-lg text-sm">Full</span>}</div></div></div>);})}</div></div>})}
          </div>
        )}

        {view==='my-requests' && isContractorAuth && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6">My Requests</h2>
            {myReqs.length===0?<div className="text-center py-12"><Mail className="w-16 h-16 mx-auto text-gray-400 mb-4"/><p className="text-gray-600">No requests yet</p></div>:<div className="space-y-4">{myReqs.map(r=><div key={r.id} className={`border rounded-lg p-4 ${r.status==='pending'?'bg-yellow-50 border-yellow-200':r.status==='approved'?'bg-green-50 border-green-200':'bg-red-50 border-red-200'}`}><div className="flex items-center gap-2 mb-2"><h3 className="font-semibold">{r.eventTitle}</h3>{r.status==='pending'&&<span className="bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full text-xs"><Clock className="w-3 h-3 inline"/>Pending</span>}{r.status==='approved'&&<span className="bg-green-200 text-green-800 px-2 py-1 rounded-full text-xs"><CheckCircle className="w-3 h-3 inline"/>Approved</span>}{r.status==='rejected'&&<span className="bg-red-200 text-red-800 px-2 py-1 rounded-full text-xs"><XCircle className="w-3 h-3 inline"/>Rejected</span>}</div><p className="text-sm text-gray-600">{r.positionRole}</p><p className="text-sm text-gray-600">{r.totalHours?.toFixed(1)} hrs ({r.rateType}) - ${r.contractorDayRate}</p></div>)}</div>}
          </div>
        )}
      </div>
    </div>
  );
}