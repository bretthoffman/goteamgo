"use client";
// @ts-nocheck

import { useEffect, useState } from "react";
import { Plus, Settings, ArrowLeft, Edit2, Save, X, Check, Building2 } from "lucide-react";

const StudioRentalApp = () => {
  const [organizations, setOrganizations] = useState([]);
  const [currentOrg, setCurrentOrg] = useState(null);
  const [showAddOrg, setShowAddOrg] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [slackWebhook, setSlackWebhook] = useState('');
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [tempEmail, setTempEmail] = useState('');
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const [deleteConfirmOrg, setDeleteConfirmOrg] = useState(null);
  const [eventDaysInput, setEventDaysInput] = useState('');
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const [showCallRoadmap, setShowCallRoadmap] = useState(false);
  const memoryStore = new Map<string, string>();
  const storage = {
    // NOTE: second arg is accepted for backwards-compat (ignored)
    async get(key: string, _json?: boolean) {
      const FORCE_MEMORY_ONLY = true;
  
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

  const defaultChecklist = [
    'Graphics',
    'Back Wall',
    'Video',
    'Playlists',
    'Remote Speakers',
    'Run of Show',
    'Freelancers',
    'Slides',
    'Cue Song',
    'Catering'
  ];


  const teamMembers = ['Brian', 'Carson', 'Blue', 'Brett', 'Kelsey', 'Caroline', 'Bari', 'Cara'];


  const allowedEmails = [
    'carson@poweredbysage.com',
    'brian@poweredbysage.com',
    'brett@poweredbysage.com',
    'kelsey@poweredbysage.com',
    'blue@poweredbysage.com',
    'bari@poweredbysage.com',
    'caroline@poweredbysage.com',
    'bmelnick@poweredbysage.com',
    'cara@poweredbysage.com'
  ];


  useEffect(() => {
    checkUserEmail();
  }, []);


  useEffect(() => {
    if (currentOrg) {
      console.log('CurrentOrg changed:', (currentOrg as any).name);
      console.log('Checklist:', (currentOrg as any).checklist);
      console.log('Checklist length:', (currentOrg as any).checklist?.length);
      setEventDaysInput((currentOrg as any).eventDays || '');
      
      // Initialize callRoadmap if it doesn't exist (for older organizations)
      if (!(currentOrg as any).callRoadmap) {
        const defaultCallRoadmap = [
          { id: 1, name: 'Jumpstart Call', date: '', time: '', notes: '' },
          { id: 2, name: 'Dashboard', date: '', time: '', notes: '' },
          { id: 3, name: 'Studio/ROS', date: '', time: '', notes: '' },
          { id: 4, name: 'Final Logistics', date: '', time: '', notes: '' },
          { id: 5, name: 'Post-Event', date: '', time: '', notes: '', isPostEvent: true }
        ];
        updateOrganization((currentOrg as any).id, { callRoadmap: defaultCallRoadmap });
      }
    }
  }, [currentOrg]);


  const checkUserEmail = async () => {
    try {
      const result = await storage.get('user-email');
      if (result && result.value) {
        setUserEmail(result.value);
        loadData();
      } else {
        setShowEmailPrompt(true);
        setLoading(false);
      }
    } catch (error) {
      setShowEmailPrompt(true);
      setLoading(false);
    }
  };


  const saveUserEmail = async () => {
    if (!tempEmail.trim() || !tempEmail.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }


    const normalizedEmail = tempEmail.toLowerCase().trim();
    if (!allowedEmails.includes(normalizedEmail)) {
      alert('Access denied. This email is not authorized to use this application.');
      return;
    }


    try {
      await storage.set('user-email', normalizedEmail);
      setUserEmail(normalizedEmail);
      setShowEmailPrompt(false);
      loadData();
    } catch (error) {
      console.error('Failed to save email:', error);
      alert('Failed to save email. Please try again.');
    }
  };


  const loadData = async () => {
    setLoading(true);
    try {
      const result = await storage.get('organizations');
      if (result) {
        const orgs = JSON.parse(result.value);
        console.log('Loaded organizations:', orgs);
        console.log('Number of orgs:', orgs.length);
        if (orgs.length > 0) {
          console.log('First org checklist length:', orgs[0].checklist?.length);
        }
        setOrganizations(orgs);
      }
    } catch (error) {
      console.log('No organizations found yet');
    }
    
    try {
      const webhookResult = await storage.get('slack-webhook');
      if (webhookResult) {
        setSlackWebhook(webhookResult.value);
      }
    } catch (error) {
      console.log('No webhook configured yet');
    }
    
    setLoading(false);
  };


  const saveOrganizations = async (updatedOrgs: any[]) => {
    try {
      await storage.set('organizations', JSON.stringify(updatedOrgs));
      setOrganizations(updatedOrgs as any);
    } catch (error) {
      console.error('Failed to save organizations:', error);
      alert('Failed to save. Please try again.');
    }
  };


  const saveSettings = async () => {
    try {
      await storage.set('slack-webhook', slackWebhook);
      alert('Slack webhook saved successfully!');
      setShowSettings(false);
    } catch (error) {
      console.error('Failed to save webhook:', error);
      alert('Failed to save webhook. Please try again.');
    }
  };


  const sendSlackNotification = async (message: string) => {
    if (!slackWebhook) return;
    
    try {
      await fetch(slackWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message })
      });
    } catch (error) {
      console.error('Failed to send Slack notification:', error);
    }
  };


  const createOrganization = async () => {
    if (!newOrgName.trim()) return;


    const newOrg = {
      id: Date.now().toString(),
      name: newOrgName,
      pointOfContact: '',
      eventDays: '',
      createdAt: new Date().toISOString(),
      callRoadmap: [
        { id: 1, name: 'Jumpstart Call', date: '', time: '', notes: '' },
        { id: 2, name: 'Dashboard', date: '', time: '', notes: '' },
        { id: 3, name: 'Studio/ROS', date: '', time: '', notes: '' },
        { id: 4, name: 'Final Logistics', date: '', time: '', notes: '' },
        { id: 5, name: 'Post-Event', date: '', time: '', notes: '', isPostEvent: true }
      ],
      checklist: defaultChecklist.map(item => ({
        id: Date.now() + Math.random(),
        text: item,
        notes: [],
        links: [],
        assignee: '',
        completed: false
      }))
    };


    const updatedOrgs = [...organizations, newOrg];
    await saveOrganizations(updatedOrgs);
    
    await sendSlackNotification(
      `🏢 *New Organization Created*\n*Name:* ${newOrg.name}\n*Created by:* ${userEmail}\n*Created:* ${new Date().toLocaleString()}`
    );


    setNewOrgName('');
    setShowAddOrg(false);
  };


  const updateOrganization = async (orgId: string, updates: any) => {
    const updatedOrgs = organizations.map(org => 
      (org as any).id === orgId ? { ...(org as any), ...updates } : org
    );
    await saveOrganizations(updatedOrgs as any);
    
    if ((currentOrg as any)?.id === orgId) {
      const updatedCurrentOrg = { ...(currentOrg as any), ...updates };
      setCurrentOrg(updatedCurrentOrg);
    }


    if (updates.pointOfContact) {
      const org = (organizations as any[]).find((o: any) => o.id === orgId);
      if (org) {
        const updatedChecklist = (org as any).checklist.map((item: any) => ({
          ...item,
          assignee: updates.pointOfContact
        }));
        
        const orgsWithUpdatedChecklist = updatedOrgs.map(o => 
          o.id === orgId ? { ...o, checklist: updatedChecklist } : o
        );
        
        await saveOrganizations(orgsWithUpdatedChecklist);
        
        if ((currentOrg as any)?.id === orgId) {
          setCurrentOrg({ ...(currentOrg as any), ...updates, checklist: updatedChecklist });
        }
      }
    }
  };


  const updateChecklistItem = async (itemId: any, updates: any) => {
    if (!currentOrg) return;
    
    const updatedChecklist = (currentOrg as any).checklist.map((item: any) =>
      item.id === itemId ? { ...item, ...updates } : item
    );
    
    await updateOrganization((currentOrg as any).id, { checklist: updatedChecklist });


    const item = (currentOrg as any).checklist.find((i: any) => i.id === itemId);
    const updatedItem = { ...item, ...updates };


    if (updates.completed !== undefined && updates.completed) {
      await sendSlackNotification(
        `✅ *Checklist Item Completed*\n*Organization:* ${(currentOrg as any).name}\n*Item:* ${updatedItem.text}\n*Completed by:* ${updatedItem.assignee || userEmail}`
      );
    }


    if (updates.assignee && updates.assignee !== item.assignee) {
      await sendSlackNotification(
        `👤 *Task Assigned*\n*Organization:* ${(currentOrg as any).name}\n*Item:* ${updatedItem.text}\n*Assigned to:* ${updates.assignee}`
      );
    }
  };


  const deleteOrganization = async (orgId: any, orgName: any) => {
    const updatedOrgs = (organizations as any[]).map((org: any) => 
      org.id === orgId ? { ...org, completed: true, completedDate: new Date().toISOString() } : org
    );
    await saveOrganizations(updatedOrgs);
    
    await sendSlackNotification(
      `🎉 *${orgName} event has been marked as completed! Congratulations on a successful event!*`
    );
    
    if ((currentOrg as any)?.id === orgId) {
      setCurrentOrg(null);
    }
    
    setDeleteConfirmOrg(null);
  };


  const handleEventDaysChange = (e: any) => {
    const value = e.target.value;
    setEventDaysInput(value);
  };


  const handleEventDaysBlur = () => {
    if (currentOrg) {
      updateOrganization((currentOrg as any).id, { eventDays: eventDaysInput });
    }
  };


  const addNewChecklistItem = async () => {
    if (!newItemText.trim()) return;
    if (!currentOrg) return;


    const newItem = {
      id: Date.now() + Math.random(),
      text: newItemText,
      notes: [],
      links: [],
      assignee: (currentOrg as any).pointOfContact || '',
      completed: false
    };


    const updatedChecklist = [newItem, ...(currentOrg as any).checklist];
    await updateOrganization((currentOrg as any).id, { checklist: updatedChecklist });


    await sendSlackNotification(
      `➕ *New Checklist Item Added*\n*Organization:* ${(currentOrg as any).name}\n*Item:* ${newItemText}\n*Added by:* ${userEmail}`
    );


    setNewItemText('');
    setShowAddItem(false);
  };


  const updateCallRoadmapItem = async (itemId: any, updates: any) => {
    if (!currentOrg) return;
    
    const updatedCallRoadmap = (currentOrg as any).callRoadmap.map((item: any) =>
      item.id === itemId ? { ...item, ...updates } : item
    );
    await updateOrganization((currentOrg as any).id, { callRoadmap: updatedCallRoadmap });
  };


  if (showEmailPrompt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8 border border-gray-200">
          <div className="text-center mb-6">
            <div className="mx-auto mb-6 w-64">
              <svg version="1.0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300.000000 169.000000" preserveAspectRatio="xMidYMid meet">
                <g transform="translate(0.000000,169.000000) scale(0.100000,-0.100000)" fill="#22A9B8" stroke="none">
                  <path d="M1924 1156 c-30 -14 -68 -44 -95 -75 l-45 -51 -204 -50 c-232 -57 -260 -60 -260 -29 0 11 5 30 11 42 7 11 13 40 15 64 2 41 1 43 -31 49 -37 7 -116 -8 -173 -32 -42 -18 -495 -134 -523 -134 -17 0 -17 2 -2 37 27 65 2 150 -52 175 -29 13 -82 -2 -240 -72 -60 -26 -158 -63 -217 -82 -101 -31 -108 -35 -108 -59 l0 -27 73 23 c40 12 130 47 200 78 132 59 245 94 272 83 21 -8 19 -71 -5 -124 l-19 -43 -53 6 c-29 4 -79 13 -111 21 -33 8 -63 12 -68 8 -11 -6 -12 -74 -1 -90 27 -42 106 -44 187 -6 44 21 82 30 143 35 67 5 238 43 375 83 16 5 17 1 12 -29 -5 -27 -2 -39 17 -62 36 -42 98 -41 168 3 53 33 80 36 80 8 0 -36 94 -27 300 29 146 40 216 53 207 38 -12 -20 15 -72 48 -93 40 -25 58 -25 114 0 24 11 46 19 48 17 2 -2 -5 -25 -16 -51 -13 -29 -45 -69 -86 -107 -196 -184 -331 -463 -282 -582 29 -68 87 -59 147 25 58 79 150 283 204 448 l53 165 69 37 c70 37 279 112 345 123 31 6 40 2 70 -28 23 -23 50 -38 75 -43 49 -9 180 9 321 45 96 24 108 29 111 50 3 20 1 23 -15 16 -48 -19 -253 -66 -312 -71 -52 -4 -73 -2 -101 13 -53 27 -45 43 35 65 92 25 135 58 135 102 0 45 -26 66 -80 66 -82 0 -180 -71 -195 -141 -5 -22 -13 -28 -43 -33 -63 -12 -254 -77 -324 -111 -38 -18 -68 -30 -68 -26 0 23 27 80 51 108 28 32 45 85 34 103 -4 6 4 10 19 10 22 0 26 4 26 30 0 27 -6 34 -42 50 -59 27 -131 25 -194 -4z m170 -35 c4 -6 -133 -51 -158 -51 -14 0 7 22 38 41 32 19 110 26 120 10z m593 -6 c7 -22 -25 -47 -91 -71 -38 -13 -71 -22 -75 -19 -12 12 26 60 64 82 40 23 95 27 102 8z m-1387 -65 c12 -8 9 -15 -18 -43 -65 -67 -202 -114 -202 -69 1 35 52 79 122 103 61 21 77 22 98 9z m745 -40 c-27 -54 -82 -93 -146 -105 -56 -10 -81 24 -60 80 6 15 32 27 97 47 49 14 99 27 112 27 l22 1 -25 -50z m-1604 -121 c-34 -28 -101 -23 -101 6 0 18 11 21 72 16 l52 -3 -23 -19z m1454 -285 c-32 -144 -56 -210 -109 -308 -55 -101 -88 -138 -119 -134 -52 7 -29 140 56 311 48 98 72 134 124 185 35 36 66 62 68 60 3 -3 -6 -54 -20 -114z"/>
                </g>
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome to SAGE</h1>
            <p className="text-gray-600">Please enter your work email to continue</p>
          </div>
          <input
            type="email"
            value={tempEmail}
            onChange={(e) => setTempEmail(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && saveUserEmail()}
            placeholder="Enter your work email"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-[#3C6577]"
            autoFocus
          />
          <button
            onClick={saveUserEmail}
            className="w-full bg-[#3C6577] text-white px-4 py-3 rounded-lg hover:bg-[#2D4D5C] transition-colors font-medium"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }


  if (!currentOrg) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <div className="mx-auto mb-6 w-80">
              <svg version="1.0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300.000000 169.000000" preserveAspectRatio="xMidYMid meet">
                <g transform="translate(0.000000,169.000000) scale(0.100000,-0.100000)" fill="#22A9B8" stroke="none">
                  <path d="M1924 1156 c-30 -14 -68 -44 -95 -75 l-45 -51 -204 -50 c-232 -57 -260 -60 -260 -29 0 11 5 30 11 42 7 11 13 40 15 64 2 41 1 43 -31 49 -37 7 -116 -8 -173 -32 -42 -18 -495 -134 -523 -134 -17 0 -17 2 -2 37 27 65 2 150 -52 175 -29 13 -82 -2 -240 -72 -60 -26 -158 -63 -217 -82 -101 -31 -108 -35 -108 -59 l0 -27 73 23 c40 12 130 47 200 78 132 59 245 94 272 83 21 -8 19 -71 -5 -124 l-19 -43 -53 6 c-29 4 -79 13 -111 21 -33 8 -63 12 -68 8 -11 -6 -12 -74 -1 -90 27 -42 106 -44 187 -6 44 21 82 30 143 35 67 5 238 43 375 83 16 5 17 1 12 -29 -5 -27 -2 -39 17 -62 36 -42 98 -41 168 3 53 33 80 36 80 8 0 -36 94 -27 300 29 146 40 216 53 207 38 -12 -20 15 -72 48 -93 40 -25 58 -25 114 0 24 11 46 19 48 17 2 -2 -5 -25 -16 -51 -13 -29 -45 -69 -86 -107 -196 -184 -331 -463 -282 -582 29 -68 87 -59 147 25 58 79 150 283 204 448 l53 165 69 37 c70 37 279 112 345 123 31 6 40 2 70 -28 23 -23 50 -38 75 -43 49 -9 180 9 321 45 96 24 108 29 111 50 3 20 1 23 -15 16 -48 -19 -253 -66 -312 -71 -52 -4 -73 -2 -101 13 -53 27 -45 43 35 65 92 25 135 58 135 102 0 45 -26 66 -80 66 -82 0 -180 -71 -195 -141 -5 -22 -13 -28 -43 -33 -63 -12 -254 -77 -324 -111 -38 -18 -68 -30 -68 -26 0 23 27 80 51 108 28 32 45 85 34 103 -4 6 4 10 19 10 22 0 26 4 26 30 0 27 -6 34 -42 50 -59 27 -131 25 -194 -4z m170 -35 c4 -6 -133 -51 -158 -51 -14 0 7 22 38 41 32 19 110 26 120 10z m593 -6 c7 -22 -25 -47 -91 -71 -38 -13 -71 -22 -75 -19 -12 12 26 60 64 82 40 23 95 27 102 8z m-1387 -65 c12 -8 9 -15 -18 -43 -65 -67 -202 -114 -202 -69 1 35 52 79 122 103 61 21 77 22 98 9z m745 -40 c-27 -54 -82 -93 -146 -105 -56 -10 -81 24 -60 80 6 15 32 27 97 47 49 14 99 27 112 27 l22 1 -25 -50z m-1604 -121 c-34 -28 -101 -23 -101 6 0 18 11 21 72 16 l52 -3 -23 -19z m1454 -285 c-32 -144 -56 -210 -109 -308 -55 -101 -88 -138 -119 -134 -52 7 -29 140 56 311 48 98 72 134 124 185 35 36 66 62 68 60 3 -3 -6 -54 -20 -114z"/>
                </g>
              </svg>
            </div>
          </div>
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-800">Studio Rental Checklist</h1>
              <p className="text-gray-600 mt-1">Manage your studio rental events. GO TEAM GO!</p>
              <p className="text-sm text-[#3C6577] mt-1">Logged in as: {userEmail}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow hover:shadow-md transition-all border border-gray-200"
              >
                <Settings className="w-5 h-5" />
                Settings
              </button>
              <button
                onClick={() => setShowAddOrg(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg shadow transition-colors"
                style={{ backgroundColor: '#3C6577', color: 'white' }}
                onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#2D4D5C'}
                onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#3C6577'}
              >
                <Plus className="w-5 h-5" />
                New Organization
              </button>
            </div>
          </div>


          {showAddOrg && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Organization Name
              </label>
              <input
                type="text"
                placeholder="Enter organization name"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && createOrganization()}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-[#3C6577]"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={createOrganization}
                  className="flex-1 bg-[#3C6577] text-white px-4 py-2 rounded-lg hover:bg-[#2D4D5C] transition-colors"
                >
                  Create Organization
                </button>
                <button
                  onClick={() => setShowAddOrg(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}


          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(organizations as any[]).filter((org: any) => !org.completed).length === 0 ? (
              <div className="col-span-full bg-white rounded-lg shadow-md p-12 text-center border border-gray-200">
                <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No active organizations. Create your first one to get started!</p>
              </div>
            ) : (
              (organizations as any[]).filter((org: any) => !org.completed).map((org: any) => {
                const completedItems = (org.checklist || []).filter((item: any) => item.completed).length;
                const totalItems = (org.checklist || []).length;
                const progress = (completedItems / totalItems) * 100;


                return (
                  <div
                    key={org.id}
                    className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 overflow-hidden cursor-pointer"
                    onClick={() => {
                      console.log('Clicked org:', org.name);
                      console.log('Org checklist:', org.checklist);
                      console.log('Checklist length:', org.checklist?.length);
                      setCurrentOrg(org);
                    }}
                  >
                    <div className="p-6">
                      <div className="mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-800 mb-1">{org.name}</h3>
                          {org.pointOfContact && (
                            <p className="text-sm text-[#3C6577] font-medium">
                              Point of Contact: {org.pointOfContact}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="mb-2">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>Progress</span>
                          <span>{completedItems}/{totalItems}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-[#3C6577] h-2 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                      
                      {org.eventDays && (
                        <p className="text-sm text-gray-700 mt-4 font-medium">
                          Event Days: {org.eventDays}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>


          {(organizations as any[]).filter((org: any) => org.completed).length > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Completed Events</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(organizations as any[]).filter((org: any) => org.completed).map((org: any) => {
                  const completedItems = (org.checklist || []).filter((item: any) => item.completed).length;
                  const totalItems = (org.checklist || []).length;
                  const progress = (completedItems / totalItems) * 100;


                  return (
                    <div
                      key={org.id}
                      className="bg-gray-50 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-300 overflow-hidden cursor-pointer opacity-75"
                      onClick={() => {
                        console.log('Clicked completed org:', org.name);
                        console.log('Org checklist:', org.checklist);
                        console.log('Checklist length:', org.checklist?.length);
                        setCurrentOrg(org);
                      }}
                    >
                      <div className="p-6">
                        <div className="mb-4">
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-700 mb-1">{org.name}</h3>
                            {org.pointOfContact && (
                              <p className="text-sm text-gray-600 font-medium">
                                Point of Contact: {org.pointOfContact}
                              </p>
                            )}
                            {org.completedDate && (
                              <p className="text-xs text-gray-500 mt-2">
                                Completed: {new Date(org.completedDate).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="mb-2">
                          <div className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>Progress</span>
                            <span>{completedItems}/{totalItems}</span>
                          </div>
                          <div className="w-full bg-gray-300 rounded-full h-2">
                            <div
                              className="bg-gray-500 h-2 rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                        
                        {org.eventDays && (
                          <p className="text-sm text-gray-600 mt-4 font-medium">
                            Event Days: {org.eventDays}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}


          {showSettings && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Settings</h2>
                  <button 
                    onClick={() => setShowSettings(false)} 
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Email
                  </label>
                  <input
                    type="email"
                    value={userEmail}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                  />
                </div>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Slack Webhook URL
                  </label>
                  <input
                    type="text"
                    value={slackWebhook}
                    onChange={(e) => setSlackWebhook(e.target.value)}
                    placeholder="https://hooks.slack.com/services/..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3C6577]"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Get your webhook URL from Slack's Incoming Webhooks app
                  </p>
                </div>
                
                <button
                  onClick={saveSettings}
                  className="w-full text-white px-6 py-3 rounded-lg transition-colors font-bold text-lg"
                  style={{ backgroundColor: '#22A9B8' }}
                  onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#1B8A96'}
                  onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#22A9B8'}
                >
                  Save Webhook URL
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-6">
          <div className="mx-auto mb-4 w-64">
            <svg version="1.0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300.000000 169.000000" preserveAspectRatio="xMidYMid meet">
              <g transform="translate(0.000000,169.000000) scale(0.100000,-0.100000)" fill="#22A9B8" stroke="none">
                <path d="M1924 1156 c-30 -14 -68 -44 -95 -75 l-45 -51 -204 -50 c-232 -57 -260 -60 -260 -29 0 11 5 30 11 42 7 11 13 40 15 64 2 41 1 43 -31 49 -37 7 -116 -8 -173 -32 -42 -18 -495 -134 -523 -134 -17 0 -17 2 -2 37 27 65 2 150 -52 175 -29 13 -82 -2 -240 -72 -60 -26 -158 -63 -217 -82 -101 -31 -108 -35 -108 -59 l0 -27 73 23 c40 12 130 47 200 78 132 59 245 94 272 83 21 -8 19 -71 -5 -124 l-19 -43 -53 6 c-29 4 -79 13 -111 21 -33 8 -63 12 -68 8 -11 -6 -12 -74 -1 -90 27 -42 106 -44 187 -6 44 21 82 30 143 35 67 5 238 43 375 83 16 5 17 1 12 -29 -5 -27 -2 -39 17 -62 36 -42 98 -41 168 3 53 33 80 36 80 8 0 -36 94 -27 300 29 146 40 216 53 207 38 -12 -20 15 -72 48 -93 40 -25 58 -25 114 0 24 11 46 19 48 17 2 -2 -5 -25 -16 -51 -13 -29 -45 -69 -86 -107 -196 -184 -331 -463 -282 -582 29 -68 87 -59 147 25 58 79 150 283 204 448 l53 165 69 37 c70 37 279 112 345 123 31 6 40 2 70 -28 23 -23 50 -38 75 -43 49 -9 180 9 321 45 96 24 108 29 111 50 3 20 1 23 -15 16 -48 -19 -253 -66 -312 -71 -52 -4 -73 -2 -101 13 -53 27 -45 43 35 65 92 25 135 58 135 102 0 45 -26 66 -80 66 -82 0 -180 -71 -195 -141 -5 -22 -13 -28 -43 -33 -63 -12 -254 -77 -324 -111 -38 -18 -68 -30 -68 -26 0 23 27 80 51 108 28 32 45 85 34 103 -4 6 4 10 19 10 22 0 26 4 26 30 0 27 -6 34 -42 50 -59 27 -131 25 -194 -4z m170 -35 c4 -6 -133 -51 -158 -51 -14 0 7 22 38 41 32 19 110 26 120 10z m593 -6 c7 -22 -25 -47 -91 -71 -38 -13 -71 -22 -75 -19 -12 12 26 60 64 82 40 23 95 27 102 8z m-1387 -65 c12 -8 9 -15 -18 -43 -65 -67 -202 -114 -202 -69 1 35 52 79 122 103 61 21 77 22 98 9z m745 -40 c-27 -54 -82 -93 -146 -105 -56 -10 -81 24 -60 80 6 15 32 27 97 47 49 14 99 27 112 27 l22 1 -25 -50z m-1604 -121 c-34 -28 -101 -23 -101 6 0 18 11 21 72 16 l52 -3 -23 -19z m1454 -285 c-32 -144 -56 -210 -109 -308 -55 -101 -88 -138 -119 -134 -52 7 -29 140 56 311 48 98 72 134 124 185 35 36 66 62 68 60 3 -3 -6 -54 -20 -114z"/>
              </g>
            </svg>
          </div>
        </div>
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => setCurrentOrg(null)}
            className="p-2 hover:bg-white rounded-lg transition-colors border border-gray-200 bg-white shadow"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold text-gray-800">{(currentOrg as any).name}</h1>
              {(currentOrg as any).completed && (
                <span className="bg-green-100 text-green-800 text-sm font-semibold px-3 py-1 rounded-full">
                  Completed
                </span>
              )}
            </div>
            {(currentOrg as any).pointOfContact && (
              <p className="text-xl text-[#3C6577] font-medium mt-1">{(currentOrg as any).pointOfContact}</p>
            )}
            <p className="text-gray-600 mt-1">Studio rental checklist</p>
          </div>
        </div>


        <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Point of Contact
              </label>
              <select
                value={(currentOrg as any).pointOfContact}
                onChange={(e) => updateOrganization((currentOrg as any).id, { pointOfContact: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3C6577] bg-white"
              >
                <option value="">Select point of contact</option>
                <option value="Brian">Brian</option>
                <option value="Carson">Carson</option>
                <option value="Blue">Blue</option>
                <option value="Brett">Brett</option>
                <option value="Kelsey">Kelsey</option>
                <option value="Caroline">Caroline</option>
                <option value="Bari">Bari</option>
                <option value="Cara">Cara</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Days
              </label>
              <input
                type="text"
                value={eventDaysInput}
                onChange={handleEventDaysChange}
                onBlur={handleEventDaysBlur}
                placeholder="e.g., Mon-Fri, Jan 15-20, etc."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3C6577]"
              />
            </div>
          </div>
        </div>


        {(currentOrg as any).callRoadmap && (
          <div className="bg-white rounded-lg shadow-md mb-6 border border-gray-200 overflow-hidden">
            <button
              onClick={() => setShowCallRoadmap(!showCallRoadmap)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <h3 className="text-lg font-semibold text-gray-800">Call Roadmap</h3>
              <span className="text-gray-500">{showCallRoadmap ? '−' : '+'}</span>
            </button>
            
            {showCallRoadmap && (
              <div className="px-6 pb-6 space-y-4">
                {(currentOrg as any).callRoadmap.map((call: any, index: number) => (
                  <div key={call.id}>
                    {call.isPostEvent && index > 0 && (
                      <div className="border-t border-gray-300 my-4"></div>
                    )}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h4 className="font-semibold text-gray-800 mb-3">{call.name}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                          <input
                            type="date"
                            value={call.date || ''}
                            onChange={(e) => updateCallRoadmapItem(call.id, { date: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3C6577]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Time</label>
                          <input
                            type="time"
                            value={call.time || ''}
                            onChange={(e) => updateCallRoadmapItem(call.id, { time: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3C6577]"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                        <textarea
                          value={call.notes || ''}
                          onChange={(e) => updateCallRoadmapItem(call.id, { notes: e.target.value })}
                          placeholder="Add notes for this call..."
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3C6577] resize-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}


        <div className="mb-6">
          {showAddItem ? (
            <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Checklist Item
              </label>
              <input
                type="text"
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addNewChecklistItem()}
                placeholder="Enter item name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-[#3C6577]"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={addNewChecklistItem}
                  className="flex-1 bg-[#3C6577] text-white px-4 py-2 rounded-lg hover:bg-[#2D4D5C] transition-colors"
                >
                  Add Item
                </button>
                <button
                  onClick={() => {
                    setShowAddItem(false);
                    setNewItemText('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddItem(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
              style={{ backgroundColor: '#3C6577', color: 'white' }}
              onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#2D4D5C'}
              onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#3C6577'}
            >
              <Plus className="w-5 h-5" />
              Add New Item
            </button>
          )}
        </div>


        <div className="space-y-3">
          {(currentOrg as any).checklist && (currentOrg as any).checklist.length > 0 ? (
            (currentOrg as any).checklist.map((item: any) => (
              <ChecklistItem
                key={item.id}
                item={item}
                orgName={(currentOrg as any).name}
                teamMembers={teamMembers}
                userEmail={userEmail}
                onUpdate={(updates: any) => updateChecklistItem(item.id, updates)}
                sendSlackNotification={sendSlackNotification}
              />
            ))
          ) : (
            <div className="bg-white rounded-lg shadow-md p-8 text-center border border-gray-200">
              <p className="text-gray-500">No checklist items yet. Click "+ Add New Item" above to get started!</p>
            </div>
          )}
        </div>


        <div className="mt-8 flex justify-center">
          {!(currentOrg as any).completed && (
            <button
              onClick={() => setDeleteConfirmOrg(currentOrg)}
              className="px-6 py-3 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
              style={{ backgroundColor: '#22A9B8' }}
              onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#1B8A96'}
              onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#22A9B8'}
            >
              <Check className="w-5 h-5" />
              Mark Event as Completed
            </button>
          )}
        </div>


        {deleteConfirmOrg && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="text-center mb-6">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4" style={{ backgroundColor: '#22A9B8', opacity: 0.2 }}>
                  <Check className="h-6 w-6" style={{ color: '#22A9B8' }} />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-3">Mark Event as Completed</h2>
                <p className="text-gray-700 font-medium mb-2">
                  Are you sure you want to mark this event as completed?
                </p>
                <p className="text-gray-600">
                  The event will be moved to "Completed Events" and can be viewed anytime.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmOrg(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  No
                </button>
                <button
                  onClick={() => deleteOrganization((deleteConfirmOrg as any).id, (deleteConfirmOrg as any).name)}
                  className="flex-1 px-4 py-2 text-white rounded-lg transition-colors font-medium"
                  style={{ backgroundColor: '#22A9B8' }}
                  onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#1B8A96'}
                  onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#22A9B8'}
                >
                  Yes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


const ChecklistItem = ({ item, orgName, teamMembers, userEmail, onUpdate, sendSlackNotification }: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const [showNotes, setShowNotes] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteText, setEditingNoteText] = useState('');
  const [showLinks, setShowLinks] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkText, setNewLinkText] = useState('');
  const [editingLinkId, setEditingLinkId] = useState(null);
  const [editingLinkUrl, setEditingLinkUrl] = useState('');
  const [editingLinkText, setEditingLinkText] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);


  const getUserNameFromEmail = (email: string) => {
    if (email === 'bmelnick@poweredbysage.com') {
      return 'Blue';
    }
    const nameBeforeAt = email.split('@')[0];
    return nameBeforeAt.charAt(0).toUpperCase() + nameBeforeAt.slice(1);
  };


  const currentUserName = getUserNameFromEmail(userEmail);


  const handleSave = () => {
    onUpdate({ text: editText });
    setIsEditing(false);
  };


  const addNote = async () => {
    if (!newNote.trim()) return;


    const note = {
      id: Date.now(),
      text: newNote,
      user: currentUserName,
      userEmail: userEmail,
      timestamp: new Date().toISOString()
    };


    const updatedNotes = [...(item.notes || []), note];
    onUpdate({ notes: updatedNotes });


    await sendSlackNotification(
      `💬 *New Note Added*\n*Organization:* ${orgName}\n*Item:* ${item.text}\n*From:* ${currentUserName} (${userEmail})\n*Note:* ${newNote}`
    );


    setNewNote('');
  };


  const startEditingNote = (note: any) => {
    setEditingNoteId(note.id);
    setEditingNoteText(note.text);
  };


  const saveEditedNote = async (noteId: any) => {
    const updatedNotes = (item.notes || []).map((note: any) =>
      note.id === noteId ? { ...note, text: editingNoteText, edited: true } : note
    );
    onUpdate({ notes: updatedNotes });
    
    setEditingNoteId(null);
    setEditingNoteText('');
  };


  const addLink = async () => {
    if (!newLinkUrl.trim()) return;


    const link = {
      id: Date.now(),
      url: newLinkUrl,
      text: newLinkText.trim() || newLinkUrl,
      user: currentUserName,
      userEmail: userEmail,
      timestamp: new Date().toISOString()
    };


    const updatedLinks = [...(item.links || []), link];
    onUpdate({ links: updatedLinks });


    await sendSlackNotification(
      `🔗 *Link Added*\n*Organization:* ${orgName}\n*Item:* ${item.text}\n*Link:* ${link.url}`
    );


    setNewLinkUrl('');
    setNewLinkText('');
  };


  const startEditingLink = (link: any) => {
    setEditingLinkId(link.id);
    setEditingLinkUrl(link.url);
    setEditingLinkText(link.text);
  };


  const saveEditedLink = async (linkId: any) => {
    const updatedLinks = (item.links || []).map((link: any) =>
      link.id === linkId ? { ...link, url: editingLinkUrl, text: editingLinkText.trim() || editingLinkUrl, edited: true } : link
    );
    onUpdate({ links: updatedLinks });
    
    setEditingLinkId(null);
    setEditingLinkUrl('');
    setEditingLinkText('');
  };


  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden" style={{ minHeight: '100px' }}>
      <div className="p-5" style={{ backgroundColor: 'white' }}>
        <div className="flex items-start gap-4">
          <button
            onClick={() => onUpdate({ completed: !item.completed })}
            className="mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0"
            style={item.completed ? { 
              backgroundColor: '#22A9B8', 
              borderColor: '#22A9B8' 
            } : { 
              borderColor: '#D1D5DB',
              backgroundColor: 'white'
            }}
          >
            {item.completed && <Check className="w-4 h-4 text-white" />}
          </button>


          <div className="flex-1" style={{ color: '#1F2937' }}>
            {isEditing ? (
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSave()}
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3C6577]"
                  autoFocus
                />
                <button
                  onClick={handleSave}
                  className="p-2 bg-[#3C6577] text-white rounded-lg hover:bg-[#2D4D5C]"
                >
                  <Save className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setEditText(item.text);
                    setIsEditing(false);
                  }}
                  className="p-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-3">
                <h3 
                  className="text-lg font-semibold"
                  style={item.completed ? { 
                    textDecoration: 'line-through', 
                    color: '#9CA3AF' 
                  } : { 
                    color: '#1F2937' 
                  }}
                >
                  {item.text}
                </h3>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5 text-gray-600" />
                </button>
              </div>
            )}


            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#4B5563' }}>Assigned To:</label>
                <select
                  value={item.assignee || ''}
                  onChange={(e) => onUpdate({ assignee: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3C6577] bg-white cursor-pointer"
                  style={{ color: '#1F2937', appearance: 'auto' }}
                >
                  <option value="">Select team member</option>
                  {teamMembers.map((member: string) => (
                    <option key={member} value={member}>{member}</option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <button
                    onClick={() => setShowNotes(!showNotes)}
                    className="px-3 py-1.5 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2 w-full"
                    style={{ backgroundColor: '#3C6577', color: 'white' }}
                    onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#2D4D5C'}
                    onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#3C6577'}
                  >
                    <span>Notes</span>
                    {(item.notes || []).length > 0 && (
                      <span 
                        style={{ 
                          backgroundColor: 'white', 
                          color: '#3C6577',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                          lineHeight: '1.2',
                          display: 'inline-block',
                          minWidth: '20px',
                          textAlign: 'center'
                        }}
                      >
                        {item.notes.length}
                      </span>
                    )}
                  </button>


                  {showNotes && (
                    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 mt-2">
                      {(item.notes || []).length > 0 && (
                        <div className="space-y-2 mb-3 max-h-60 overflow-y-auto">
                          {(item.notes || []).map((note: any) => (
                            <div key={note.id} className="bg-white rounded-lg p-3 border border-gray-200">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">
                                    {note.user} • {new Date(note.timestamp).toLocaleString()}
                                    {note.edited && <span className="italic ml-1">(edited)</span>}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {note.userEmail === userEmail && (
                                    <>
                                      <button
                                        onClick={() => startEditingNote(note)}
                                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                                        title="Edit note"
                                      >
                                        <Edit2 className="w-3 h-3 text-gray-600" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          console.log('Delete note button clicked, note ID:', note.id);
                                          setDeleteConfirm({ type: 'note', id: note.id } as any);
                                        }}
                                        className="p-1 hover:bg-red-50 rounded transition-colors"
                                        title="Delete note"
                                      >
                                        <X className="w-3 h-3 text-red-600" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                              {editingNoteId === note.id ? (
                                <div className="flex gap-2 mt-2">
                                  <input
                                    type="text"
                                    value={editingNoteText}
                                    onChange={(e) => setEditingNoteText(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && saveEditedNote(note.id)}
                                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#3C6577]"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => saveEditedNote(note.id)}
                                    className="px-3 py-1 bg-[#3C6577] text-white rounded hover:bg-[#2D4D5C] text-xs"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingNoteId(null)}
                                    className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-xs"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <p className="text-sm text-gray-700">{note.text}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}


                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && addNote()}
                            placeholder="Add a note..."
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3C6577]"
                          />
                          <button
                            onClick={addNote}
                            className="px-4 py-2 bg-[#3C6577] text-white rounded-lg hover:bg-[#2D4D5C] transition-colors text-sm font-medium"
                          >
                            Send
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>


                <div className="flex flex-col">
                  <button
                    onClick={() => setShowLinks(!showLinks)}
                    className="px-3 py-1.5 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2 w-full"
                    style={{ backgroundColor: '#3C6577', color: 'white' }}
                    onMouseEnter={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#2D4D5C'}
                    onMouseLeave={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#3C6577'}
                  >
                    <span>Links</span>
                    {item.links && item.links.length > 0 && (
                      <span 
                        style={{ 
                          backgroundColor: 'white', 
                          color: '#3C6577',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                          lineHeight: '1.2',
                          display: 'inline-block',
                          minWidth: '20px',
                          textAlign: 'center'
                        }}
                      >
                        {item.links.length}
                      </span>
                    )}
                  </button>


                  {showLinks && (
                    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 mt-2">
                      {item.links && item.links.length > 0 && (
                        <div className="space-y-2 mb-3 max-h-60 overflow-y-auto">
                          {(item.links || []).map((link: any) => (
                            <div key={link.id} className="bg-white rounded-lg p-3 border border-gray-200">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2 flex-1">
                                  {editingLinkId === link.id ? (
                                    <div className="flex-1 space-y-2">
                                      <input
                                        type="url"
                                        value={editingLinkUrl}
                                        onChange={(e) => setEditingLinkUrl(e.target.value)}
                                        placeholder="URL"
                                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#3C6577]"
                                      />
                                      <input
                                        type="text"
                                        value={editingLinkText}
                                        onChange={(e) => setEditingLinkText(e.target.value)}
                                        placeholder="Display text (optional)"
                                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#3C6577]"
                                      />
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => saveEditedLink(link.id)}
                                          className="px-3 py-1 bg-[#3C6577] text-white rounded hover:bg-[#2D4D5C] text-xs"
                                        >
                                          Save
                                        </button>
                                        <button
                                          onClick={() => setEditingLinkId(null)}
                                          className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-xs"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <a
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[#3C6577] hover:text-[#2D4D5C] underline text-sm flex-1"
                                      >
                                        {link.text}
                                      </a>
                                      {link.edited && (
                                        <span className="text-xs text-gray-500 italic">(edited)</span>
                                      )}
                                    </>
                                  )}
                                </div>
                                {editingLinkId !== link.id && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">
                                      {link.user} • {new Date(link.timestamp).toLocaleString()}
                                    </span>
                                    {link.userEmail === userEmail && (
                                      <>
                                        <button
                                          onClick={() => startEditingLink(link)}
                                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                                          title="Edit link"
                                        >
                                          <Edit2 className="w-3 h-3 text-gray-600" />
                                        </button>
                                        <button
                                          onClick={() => {
                                            console.log('Delete link button clicked, link ID:', link.id);
                                            setDeleteConfirm({ type: 'link', id: link.id } as any);
                                          }}
                                          className="p-1 hover:bg-red-50 rounded transition-colors"
                                          title="Delete link"
                                        >
                                          <X className="w-3 h-3 text-red-600" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}


                      <div className="space-y-2">
                        <input
                          type="url"
                          value={newLinkUrl}
                          onChange={(e) => setNewLinkUrl(e.target.value)}
                          placeholder="Paste URL..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3C6577]"
                        />
                        <input
                          type="text"
                          value={newLinkText}
                          onChange={(e) => setNewLinkText(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addLink()}
                          placeholder="Display text (optional)"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3C6577]"
                        />
                        <button
                          onClick={addLink}
                          className="w-full px-4 py-2 bg-[#3C6577] text-white rounded-lg hover:bg-[#2D4D5C] transition-colors text-sm font-medium"
                        >
                          Add Link
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


      {deleteConfirm && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setDeleteConfirm(null);
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-3">Delete {(deleteConfirm as any).type === 'note' ? 'Note' : 'Link'}?</h2>
              <p className="text-gray-600">
                Are you sure you want to delete this {(deleteConfirm as any).type}? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  console.log('No button clicked');
                  setDeleteConfirm(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                No
              </button>
              <button
                onClick={() => {
                  console.log('YES DELETE BUTTON CLICKED!');
                  console.log('deleteConfirm:', deleteConfirm);
                  
                  if (deleteConfirm && (deleteConfirm as any).type === 'note') {
                    console.log('Calling handleDeleteNote');
                    const currentNotes = item.notes || [];
                    const filteredNotes = currentNotes.filter((note: any) => note.id !== (deleteConfirm as any).id);
                    console.log('Before:', currentNotes.length, 'After:', filteredNotes.length);
                    onUpdate({ notes: filteredNotes });
                    setDeleteConfirm(null);
                  } else if (deleteConfirm && (deleteConfirm as any).type === 'link') {
                    console.log('Calling handleDeleteLink');
                    const currentLinks = item.links || [];
                    const filteredLinks = currentLinks.filter((link: any) => link.id !== (deleteConfirm as any).id);
                    console.log('Before:', currentLinks.length, 'After:', filteredLinks.length);
                    onUpdate({ links: filteredLinks });
                    setDeleteConfirm(null);
                  }
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default StudioRentalApp;
