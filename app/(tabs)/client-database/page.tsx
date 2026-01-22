"use client";

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const ClientDatabase = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    firstName: '',
    lastName: '',
    clientId: '',
    email: '',
    phone: '',
    company: '',
    activeLeaper: ''
  });
  const [debouncedFilters, setDebouncedFilters] = useState(filters);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const rowsPerPage = 100;

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
    const firstName = (client['First Name'] || '').toString().toLowerCase();
    const lastName = (client['Last Name'] || '').toString().toLowerCase();
    const clientId = (client['Id'] || '').toString().toLowerCase();
    const email = (client['Email'] || '').toString().toLowerCase();
    const phone = (client['Phone 1'] || '').toString().toLowerCase();
    const company = (client['Company Name'] || '').toString().toLowerCase();
    const tags = (client['Tags'] || '').toString().toLowerCase();
    
    // Determine activeLeaper status from Tags
    const activeLeaperValue = tags.includes('leap') ? 'active' : tags.includes('former leap') ? 'inactive' : '';
    const activeLeaperFilter = debouncedFilters.activeLeaper.toLowerCase();

    return (
      firstName.startsWith(debouncedFilters.firstName.toLowerCase()) &&
      lastName.startsWith(debouncedFilters.lastName.toLowerCase()) &&
      clientId.startsWith(debouncedFilters.clientId.toLowerCase()) &&
      email.startsWith(debouncedFilters.email.toLowerCase()) &&
      phone.startsWith(debouncedFilters.phone.toLowerCase()) &&
      company.startsWith(debouncedFilters.company.toLowerCase()) &&
      (activeLeaperFilter === '' || activeLeaperValue.startsWith(activeLeaperFilter))
    );
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
        
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-cyan-400">
                  <th className="border border-slate-300 px-4 py-2 text-left text-sm font-semibold text-slate-800">First Name</th>
                  <th className="border border-slate-300 px-4 py-2 text-left text-sm font-semibold text-slate-800">Last Name</th>
                  <th className="border border-slate-300 px-4 py-2 text-left text-sm font-semibold text-slate-800">Client ID</th>
                  <th className="border border-slate-300 px-4 py-2 text-left text-sm font-semibold text-slate-800">Email</th>
                  <th className="border border-slate-300 px-4 py-2 text-left text-sm font-semibold text-slate-800">Phone</th>
                  <th className="border border-slate-300 px-4 py-2 text-left text-sm font-semibold text-slate-800">Company</th>
                  <th className="border border-slate-300 px-4 py-2 text-left text-sm font-semibold text-slate-800">Active Leaper</th>
                </tr>
                {/* Filter Row */}
                <tr className="bg-cyan-400">
                  <th className="border border-slate-300 p-1">
                    <input
                      type="text"
                      value={filters.firstName}
                      onChange={(e) => handleFilterChange('firstName', e.target.value)}
                      className="w-full px-2 py-1 text-sm border-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Filter..."
                    />
                  </th>
                  <th className="border border-slate-300 p-1">
                    <input
                      type="text"
                      value={filters.lastName}
                      onChange={(e) => handleFilterChange('lastName', e.target.value)}
                      className="w-full px-2 py-1 text-sm border-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Filter..."
                    />
                  </th>
                  <th className="border border-slate-300 p-1">
                    <input
                      type="text"
                      value={filters.clientId}
                      onChange={(e) => handleFilterChange('clientId', e.target.value)}
                      className="w-full px-2 py-1 text-sm border-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Filter..."
                    />
                  </th>
                  <th className="border border-slate-300 p-1">
                    <input
                      type="text"
                      value={filters.email}
                      onChange={(e) => handleFilterChange('email', e.target.value)}
                      className="w-full px-2 py-1 text-sm border-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Filter..."
                    />
                  </th>
                  <th className="border border-slate-300 p-1">
                    <input
                      type="text"
                      value={filters.phone}
                      onChange={(e) => handleFilterChange('phone', e.target.value)}
                      className="w-full px-2 py-1 text-sm border-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Filter..."
                    />
                  </th>
                  <th className="border border-slate-300 p-1">
                    <input
                      type="text"
                      value={filters.company}
                      onChange={(e) => handleFilterChange('company', e.target.value)}
                      className="w-full px-2 py-1 text-sm border-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Filter..."
                    />
                  </th>
                  <th className="border border-slate-300 p-1">
                    <input
                      type="text"
                      value={filters.activeLeaper}
                      onChange={(e) => handleFilterChange('activeLeaper', e.target.value)}
                      className="w-full px-2 py-1 text-sm border-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Filter..."
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedClients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="border border-slate-300 px-4 py-8 text-center text-slate-500">
                      No matching clients found
                    </td>
                  </tr>
                ) : (
                  paginatedClients.map((client, index) => {
                    const tags = (client['Tags'] || '').toString();
                    const isActiveLeaper = tags.toLowerCase().includes('leap') && !tags.toLowerCase().includes('former leap');
                    const activeLeaperStatus = isActiveLeaper ? 'Active' : tags.toLowerCase().includes('former leap') ? 'Inactive' : '';
                    
                    return (
                      <tr 
                        key={client['Id'] || index} 
                        className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                      >
                        <td className="border border-slate-300 px-4 py-2 text-sm text-slate-800">{client['First Name'] || ''}</td>
                        <td className="border border-slate-300 px-4 py-2 text-sm text-slate-800">{client['Last Name'] || ''}</td>
                        <td className="border border-slate-300 px-4 py-2 text-sm text-slate-700">{client['Id'] || ''}</td>
                        <td className="border border-slate-300 px-4 py-2 text-sm text-slate-700">{client['Email'] || ''}</td>
                        <td className="border border-slate-300 px-4 py-2 text-sm text-slate-700">{client['Phone 1'] || ''}</td>
                        <td className="border border-slate-300 px-4 py-2 text-sm text-slate-700">{client['Company Name'] || ''}</td>
                        <td className="border border-slate-300 px-4 py-2 text-sm text-slate-700">
                          {activeLeaperStatus && (
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                              activeLeaperStatus === 'Active' ? 'bg-green-100 text-green-800' :
                              activeLeaperStatus === 'Inactive' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {activeLeaperStatus}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
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
    </div>
  );
};

export default ClientDatabase;
