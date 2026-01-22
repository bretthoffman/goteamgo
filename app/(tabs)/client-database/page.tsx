"use client";

import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X, Plus } from 'lucide-react';

// All available CSV columns (excluding the ones we start with)
const ALL_CSV_COLUMNS = [
  'Name', 'Spouse Name', 'Birthday', 'Company Id', 'Phone 1 Ext', 'Phone 1 Type',
  'Phone 2', 'Phone 2 Ext', 'Phone 2 Type', 'Phone 3', 'Phone 3 Ext', 'Phone 3 Type',
  'Email Address 2', 'Email Address 3', 'Fax 1', 'Fax 1 Type', 'Fax 2', 'Fax 2 Type',
  'Street Address 1', 'Street Address 2', 'City', 'State', 'Postal Code', 'Zip Four', 'Country',
  'Street Address 1 (Shipping)', 'Street Address 2 (Shipping)', 'City (Shipping)', 'State (Shipping)',
  'Postal Code (Shipping)', 'Zip Four (Shipping)', 'Country (Shipping)', 'Twitter', 'Facebook',
  'LinkedIn', 'Instagram', 'YouTube', 'Snapchat', 'Pinterest', 'Street Address 1 (Optional)',
  'Street Address 2 (Optional)', 'City (Optional)', 'State (Optional)', 'Postal Code (Optional)',
  'Zip Four (Optional)', 'Country (Optional)', 'Phone 4', 'Phone 4 Ext', 'Phone 4 Type',
  'Phone 5', 'Phone 5 Ext', 'Phone 5 Type', 'Tag Ids', 'Tags', 'Tag Category Ids', 'Tag Categories',
  'Person Type', 'Job Title', 'Website', 'Middle Name', 'Nickname', 'User Name', 'Password',
  'Assistant Name', 'Assistant Phone', 'Title', 'Suffix', 'Anniversary', 'Created By',
  'Date Created', 'Last Updated', 'OwnerID', 'Notes', 'Language', 'Time Zone', 'Owner',
  'Lead Source', 'Lead Source Category', 'Referral Code', 'Email Status', 'Gift name', 'Quantity',
  'Personal message', 'TVE4 Magic Link', 'TVE4 Swag Box Tracking', 'TVE4 Swag Box Carrier',
  'TVE4 Top 100 Leaderboard', 'TVE4 Top Leaderboard URL', 'TVE3 Webinar Date/Time',
  'TVE3 Webinar Optin Page', 'TVE3 Webinar Date for PlusThis', 'test', 'EpicEventObvioKey',
  'ObvioPreviewKey', 'New Obvio User Temp Password', 'Custom_ShippingCountry', 'Custom_BillingCountry',
  'TVE7 Obvio Login URL', 'TVE8 Coaching Zone Apt Time', 'TVE10 Obvio Login Link',
  'Affiliate Code Source', 'Remarketing Source', 'LEAP Cohort', 'LEAP Next Payment Date',
  'EAC24-Access', 'Summer School Access', 'The Offer Effect Workshop',
  'Last updated listing in directory', 'LEAP Dash Obvio URL', 'Leap3030 Token',
  'Pre-Submitted Question', 'Referring Friend\'s Name', 'Referring Friend\'s Email',
  'Instagram', 'YouTube URL', 'How big is your email list?',
  'How big is your social media following?',
  'How often do you communicate to your list via email or social me',
  'What questions do you have for us to set you up for the best suc',
  'What affiliate partner content would you like to see that will m',
  'What is your PayPal email address?', 'Blue & Bari - VIP Day - Quiz Results',
  'Live Event Date', 'Test CFQ', 'TEst CFQ2', 'nwe CFQW', 'BTS Testing Sept 16 2023',
  'LoginToken', 'State Events 23', 'Onboarding Workshop URL', 'Obvio 2nd Birthday URL',
  'Ask Bari Anything Question', 'Obvio Updates Magic Link', 'OfferCamp Obvio URL',
  'LEAP Annie Book Link', 'TVE7 WebinarReferral', 'NewLoginField',
  'Welcome Email Test Field Can Be Deleted', 'Dynamo Testing 041524 Login URL',
  '11_07_2024_LT', 'TVE8 Obvio Login URL', 'EAC24 Obvio Login', 'replayExpirationTimestamp',
  'replayExpirationTime', 'replayExpirationYear', 'replayExpirationDOW', 'replayExpirationMonth',
  'webinarTimestamp', 'webinarTime', 'webinarYear', 'webinarMonth', 'webinarDOW', 'replayURL',
  'joinURL', 'webinarAEventJoinURL', 'WebinarTimeEST', 'T-Shirt Size', 'TVE Date',
  'TVE Webinar Selector', 'TVE Webinar Selector Date/Time', 'TVE Webinar Optin Page',
  'TVE Webinar Optin Page Variant', 'LoginToken2May', 'ACE Pod Day', 'ACE Pod Date/Time',
  'Pod Number', 'LEAP: Start Date', 'LEAP: Member Since', 'Payment Option', 'MEMBERS Password',
  'LEAP', 'LEAP Xmas Party URL', 'Partner First Name', 'Partner Last Name', 'Partner Email Address',
  'Partner Type', 'affiliate', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content',
  'utm_term', 'fbc_id', 'h_ad_id'
];

type ColumnConfig = {
  key: string;
  label: string;
  csvKey: string;
};

const ClientDatabase = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showEditColumns, setShowEditColumns] = useState(false);
  const [showAddColumns, setShowAddColumns] = useState(false);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  
  // Default columns (removed Active Leaper)
  const [visibleColumns, setVisibleColumns] = useState<ColumnConfig[]>([
    { key: 'firstName', label: 'First Name', csvKey: 'First Name' },
    { key: 'lastName', label: 'Last Name', csvKey: 'Last Name' },
    { key: 'clientId', label: 'Client ID', csvKey: 'Id' },
    { key: 'email', label: 'Email', csvKey: 'Email' },
    { key: 'phone', label: 'Phone', csvKey: 'Phone 1' },
    { key: 'company', label: 'Company', csvKey: 'Company Name' },
  ]);
  
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [debouncedFilters, setDebouncedFilters] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const rowsPerPage = 100;
  
  // Initialize filters based on visible columns
  useEffect(() => {
    const initialFilters: Record<string, string> = {};
    visibleColumns.forEach(col => {
      initialFilters[col.key] = '';
    });
    setFilters(initialFilters);
    setDebouncedFilters(initialFilters);
  }, [visibleColumns]);

  // Password authentication
  const handlePasswordSubmit = () => {
    if (password === 'sage5180') {
      setIsAuthenticated(true);
      setPassword('');
    } else {
      alert('Incorrect password');
      setPassword('');
    }
  };

  // Fetch contacts from API
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchContacts = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/keap/contacts', { method: 'GET' });
        const data = await res.json();

        if (!res.ok) {
          console.error('Error fetching contacts:', data.error);
          setClients([]);
          setTotalCount(0);
        } else {
          setClients(data.contacts || []);
          setTotalCount(data.totalCount || 0);
        }
      } catch (err) {
        console.error('Error:', err);
        setClients([]);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, [isAuthenticated]);

  // Debounce filter changes (250ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters(filters);
      setCurrentPage(1); // Reset to first page when filters change
    }, 250);

    return () => clearTimeout(timer);
  }, [filters]);

  // Filter clients based on startsWith logic (front to back)
  const filteredClients = clients.filter(client => {
    return visibleColumns.every(col => {
      const filterValue = debouncedFilters[col.key] || '';
      if (!filterValue) return true;
      
      const clientValue = (client[col.csvKey] || '').toString().toLowerCase();
      return clientValue.startsWith(filterValue.toLowerCase());
    });
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredClients.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedClients = filteredClients.slice(startIndex, endIndex);

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Column management functions
  const removeColumn = (key: string) => {
    setVisibleColumns(prev => prev.filter(col => col.key !== key));
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  };

  const addColumn = (csvKey: string) => {
    const label = csvKey;
    const key = csvKey.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    // Check if column already exists
    if (visibleColumns.some(col => col.csvKey === csvKey)) {
      return;
    }
    
    setVisibleColumns(prev => [...prev, { key, label, csvKey }]);
    setFilters(prev => ({ ...prev, [key]: '' }));
    setShowAddColumns(false);
  };

  const handleDragStart = (key: string) => {
    setDraggedColumn(key);
  };

  const handleDragOver = (e: React.DragEvent, key: string) => {
    e.preventDefault();
    setDragOverColumn(key);
  };

  const handleDrop = (e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    if (!draggedColumn || draggedColumn === targetKey) {
      setDraggedColumn(null);
      setDragOverColumn(null);
      return;
    }

    const draggedIndex = visibleColumns.findIndex(col => col.key === draggedColumn);
    const targetIndex = visibleColumns.findIndex(col => col.key === targetKey);
    
    const newColumns = [...visibleColumns];
    const [removed] = newColumns.splice(draggedIndex, 1);
    newColumns.splice(targetIndex, 0, removed);
    
    setVisibleColumns(newColumns);
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  const handleDragEnd = () => {
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  // Get available columns (all CSV columns minus visible ones)
  const availableColumns = ALL_CSV_COLUMNS.filter(
    csvKey => !visibleColumns.some(col => col.csvKey === csvKey)
  );

  // Password prompt UI (exact match to studio rental checklist)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6" style={{ color: "#111" }}>
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
            <p className="text-gray-600">Enter password to access database</p>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
            placeholder="enter password"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-[#3C6577]"
            autoFocus
          />
          <button
            onClick={handlePasswordSubmit}
            className="w-full bg-[#3C6577] text-white px-4 py-3 rounded-lg hover:bg-[#2D4D5C] transition-colors font-medium"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center" style={{ color: "#111" }}>
        <div className="text-gray-600">Loading contacts...</div>
      </div>
    );
  }

  // Database interface
  return (
    <div className="min-h-screen bg-slate-50 p-6" style={{ color: "#111" }}>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-800 mb-4">Client Database</h1>
        
        <div className="bg-white rounded-lg shadow overflow-hidden relative">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-cyan-400 relative">
                  {visibleColumns.map((col, index) => (
                    <th 
                      key={col.key} 
                      className="border border-slate-300 px-4 py-2 text-left text-sm font-semibold text-slate-800 relative"
                    >
                      {col.label}
                      {index === visibleColumns.length - 1 && (
                        <button
                          onClick={() => setShowEditColumns(true)}
                          className="absolute top-1 right-1 px-2 py-0.5 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                          Edit Columns
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
                {/* Filter Row */}
                <tr className="bg-cyan-400">
                  {visibleColumns.map((col) => (
                    <th key={col.key} className="border border-slate-300 p-1">
                      <input
                        type="text"
                        value={filters[col.key] || ''}
                        onChange={(e) => handleFilterChange(col.key, e.target.value)}
                        className="w-full px-2 py-1 text-sm border-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Filter..."
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedClients.length === 0 ? (
                  <tr>
                    <td colSpan={visibleColumns.length} className="border border-slate-300 px-4 py-8 text-center text-slate-500">
                      No matching clients found
                    </td>
                  </tr>
                ) : (
                  paginatedClients.map((client, index) => (
                    <tr 
                      key={client['Id'] || index} 
                      className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                    >
                      {visibleColumns.map((col) => (
                        <td key={col.key} className="border border-slate-300 px-4 py-2 text-sm text-slate-700">
                          {client[col.csvKey] || ''}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Controls */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-slate-600">
            Showing {filteredClients.length === 0 ? 0 : startIndex + 1} to {Math.min(endIndex, filteredClients.length)} of {filteredClients.length} clients
            {filteredClients.length !== totalCount && ` (filtered from ${totalCount} total)`}
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
                className="p-2 rounded bg-white border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                title="First page"
              >
                <ChevronsLeft size={18} />
              </button>
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded bg-white border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                title="Previous page"
              >
                <ChevronLeft size={18} />
              </button>
              
              <span className="text-sm text-slate-700 px-4">
                Page {currentPage} of {totalPages}
              </span>
              
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded bg-white border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                title="Next page"
              >
                <ChevronRight size={18} />
              </button>
              <button
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-2 rounded bg-white border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                title="Last page"
              >
                <ChevronsRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit Columns Modal */}
      {showEditColumns && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowEditColumns(false);
            setShowAddColumns(false);
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">Edit Columns</h2>
              <button
                onClick={() => {
                  setShowEditColumns(false);
                  setShowAddColumns(false);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-hidden flex">
              {/* Column List */}
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="space-y-2">
                  {visibleColumns.map((col, index) => (
                    <div
                      key={col.key}
                      draggable
                      onDragStart={() => handleDragStart(col.key)}
                      onDragOver={(e) => handleDragOver(e, col.key)}
                      onDrop={(e) => handleDrop(e, col.key)}
                      onDragEnd={handleDragEnd}
                      className={`
                        flex items-center gap-2 p-3 border rounded-lg cursor-move
                        ${draggedColumn === col.key ? 'opacity-50' : ''}
                        ${dragOverColumn === col.key ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
                      `}
                    >
                      <button
                        onClick={() => removeColumn(col.key)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Remove column"
                      >
                        <X size={16} />
                      </button>
                      <div className="flex-1 flex items-center gap-2 group">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
                          <div className="grid grid-cols-3 gap-0.5 w-4 h-4">
                            {[...Array(9)].map((_, i) => (
                              <div key={i} className="w-1 h-1 bg-gray-400 rounded-full" />
                            ))}
                          </div>
                        </div>
                        <span className="text-sm font-medium text-gray-800 group-hover:text-gray-400 transition-colors">{col.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Column Button/Panel */}
              <div className="w-12 border-l flex items-center justify-center relative">
                {!showAddColumns ? (
                  <button
                    onClick={() => setShowAddColumns(true)}
                    className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                    title="Add column"
                  >
                    <Plus size={24} />
                  </button>
                ) : (
                  <div className="absolute right-0 top-0 bottom-0 w-80 bg-white border-l shadow-lg flex flex-col">
                    <div className="p-4 border-b flex justify-between items-center">
                      <h3 className="font-semibold text-gray-800">Available Columns</h3>
                      <button
                        onClick={() => setShowAddColumns(false)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2">
                      {availableColumns.length === 0 ? (
                        <p className="text-sm text-gray-500 p-4 text-center">All columns are visible</p>
                      ) : (
                        <div className="space-y-1">
                          {availableColumns.map((csvKey) => (
                            <button
                              key={csvKey}
                              onClick={() => addColumn(csvKey)}
                              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded transition-colors"
                            >
                              {csvKey}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDatabase;
