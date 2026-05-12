import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../lib/authContext';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Wallet, Loader2, Landmark, TrendingUp, Search, Calendar, Star } from 'lucide-react';
import { format } from 'date-fns';

export const Dashboard = () => {
  const { profile, user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Data state
  const [transactions, setTransactions] = useState<any[]>([]);
  const [usersInfo, setUsersInfo] = useState<Record<string, any>>({});
  
  // Filter state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [emailFilter, setEmailFilter] = useState('');

  const [stats, setStats] = useState({
    shares: 0,
    savings: 0,
    loans: 0,
    specialSavings: 0,
    count: 0
  });

  useEffect(() => {
    if (!profile || !user) return;

    let q;
    if (profile.role === 'admin') {
      q = query(collection(db, 'transactions'));
      
      // Fetch users for admin to map emails
      getDocs(collection(db, 'users')).then(snap => {
        const uMap: Record<string, any> = {};
        snap.forEach(doc => {
          uMap[doc.id] = doc.data();
        });
        setUsersInfo(uMap);
      });
    } else {
      q = query(collection(db, 'transactions'), where('userId', '==', user.uid));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let shares = 0;
      let savings = 0;
      let loans = 0;
      let specialSavings = 0;
      const txs: any[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        txs.push({ id: doc.id, ...data });
        if (data.shares) shares += (data.shares.cr || 0) - (data.shares.dr || 0);
        if (data.saving) savings += (data.saving.cr || 0) - (data.saving.dr || 0);
        if (data.loans) loans += (data.loans.dr || 0) - (data.loans.cr || 0);
        if (data.specialSavings) specialSavings += (data.specialSavings.cr || 0) - (data.specialSavings.dr || 0);
      });

      setTransactions(txs);
      setStats({
        shares,
        savings,
        loans,
        specialSavings,
        count: snapshot.size
      });
      setLoading(false);
    }, (error) => {
      console.error("Error fetching transactions:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile, user]);

  // Derived user balances for Admin Table
  const adminSummaryRows = useMemo(() => {
    if (profile?.role !== 'admin' || !usersInfo) return [];

    let filteredTxs = transactions;

    // Apply date filters if set
    if (startDate) {
      const start = new Date(startDate).getTime();
      filteredTxs = filteredTxs.filter(tx => tx.createdAt?.toMillis() >= start);
    }
    if (endDate) {
      // Set end date to end of the day for inclusivity
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filteredTxs = filteredTxs.filter(tx => tx.createdAt?.toMillis() <= end.getTime());
    }

    // Apply email filter
    const lowerEmailFilter = emailFilter.toLowerCase().trim();
    if (lowerEmailFilter) {
      filteredTxs = filteredTxs.filter(tx => {
        const uEmail = usersInfo[tx.userId]?.email || '';
        return uEmail.toLowerCase().includes(lowerEmailFilter);
      });
    }

    // Compute balances per user
    const userMap: Record<string, any> = {};

    filteredTxs.forEach(tx => {
      const uid = tx.userId;
      if (!userMap[uid]) {
        userMap[uid] = {
          email: usersInfo[uid]?.email || uid,
          shares: 0,
          savings: 0,
          loans: 0,
          loanInterest: 0,
          specialSavings: 0,
          latestDate: 0
        };
      }

      const ub = userMap[uid];
      if (tx.shares) ub.shares += (tx.shares.cr || 0) - (tx.shares.dr || 0);
      if (tx.saving) ub.savings += (tx.saving.cr || 0) - (tx.saving.dr || 0);
      if (tx.loans) ub.loans += (tx.loans.dr || 0) - (tx.loans.cr || 0);
      if (tx.loanInterest) ub.loanInterest += (tx.loanInterest.dr || 0) - (tx.loanInterest.cr || 0);
      if (tx.specialSavings) ub.specialSavings += (tx.specialSavings.cr || 0) - (tx.specialSavings.dr || 0);
      
      const txMillis = tx.createdAt?.toMillis() || 0;
      if (txMillis > ub.latestDate) {
        ub.latestDate = txMillis;
      }
    });

    return Object.values(userMap).sort((a, b) => b.latestDate - a.latestDate); // Sort by most recent activity
  }, [transactions, usersInfo, profile, startDate, endDate, emailFilter]);

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard</h2>
        <p className="text-sm text-gray-500">
          {profile?.role === 'admin' ? 'Overview of all society assets.' : 'Your personal cooperative holdings overview.'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
          <div className="flex items-center gap-3 text-gray-500 mb-2">
            <TrendingUp className="w-5 h-5 text-indigo-500" />
            <h3 className="text-sm font-medium">Total Shares</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.shares.toFixed(2)}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
          <div className="flex items-center gap-3 text-gray-500 mb-2">
            <Wallet className="w-5 h-5 text-blue-500" />
            <h3 className="text-sm font-medium">Net Savings</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">₦{stats.savings.toFixed(2)}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
          <div className="flex items-center gap-3 text-gray-500 mb-2">
            <Landmark className="w-5 h-5 text-red-500" />
            <h3 className="text-sm font-medium">Outstanding Loans</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">₦{stats.loans.toFixed(2)}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
          <div className="flex items-center gap-3 text-gray-500 mb-2">
            <Star className="w-5 h-5 text-yellow-500" />
            <h3 className="text-sm font-medium">Special Savings</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">₦{stats.specialSavings.toFixed(2)}</p>
        </div>
      </div>
      
      {profile?.role === 'admin' ? (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">User Balances Summary</h3>
              <p className="text-sm text-gray-500">Calculated running balances for each standard user based on applied filters.</p>
            </div>
            
            <div className="flex flex-col xl:flex-row flex-wrap gap-3 items-start xl:items-center w-full sm:w-auto mt-4 sm:mt-0">
              <div className="relative w-full sm:w-auto">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Filter by email..." 
                  value={emailFilter}
                  onChange={(e) => setEmailFilter(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-500 w-full sm:w-48 transition-colors"
                />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none">
                  <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-500 w-full sm:w-[140px] transition-colors text-gray-600"
                  />
                </div>
                <span className="text-gray-400 text-sm">to</span>
                <div className="relative flex-1 sm:flex-none">
                  <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-500 w-full sm:w-[140px] transition-colors text-gray-600"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto rounded-lg border border-gray-100">
            <table className="min-w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">User Email</th>
                  <th className="px-4 py-3 font-semibold text-right">Shares</th>
                  <th className="px-4 py-3 font-semibold text-right">Savings</th>
                  <th className="px-4 py-3 font-semibold text-right">Loans</th>
                  <th className="px-4 py-3 font-semibold text-right">Loan Interest</th>
                  <th className="px-4 py-3 font-semibold text-right">Special Savings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {adminSummaryRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      No matching records found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  adminSummaryRows.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-500">
                        {row.latestDate ? format(new Date(row.latestDate), 'MMM d, yyyy') : 'No Data'}
                      </td>
                      <td className="px-4 py-3 text-gray-900 font-medium">{row.email}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700 font-medium">
                        {row.shares > 0 ? (
                            <span className="text-green-600">{row.shares.toFixed(2)}</span>
                        ) : row.shares < 0 ? (
                            <span className="text-red-500">-{Math.abs(row.shares).toFixed(2)}</span>
                        ) : (
                            <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700 font-medium">
                        {row.savings > 0 ? (
                            <span className="text-green-600">₦{row.savings.toFixed(2)}</span>
                        ) : row.savings < 0 ? (
                            <span className="text-red-500">-₦{Math.abs(row.savings).toFixed(2)}</span>
                        ) : (
                            <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700 font-medium">
                        {row.loans > 0 ? (
                            <span className="text-red-600">₦{row.loans.toFixed(2)}</span>
                        ) : row.loans < 0 ? (
                            <span className="text-green-600">-₦{Math.abs(row.loans).toFixed(2)}</span>
                        ) : (
                            <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700 font-medium">
                        {row.loanInterest !== 0 ? (
                            <span>₦{row.loanInterest.toFixed(2)}</span>
                        ) : (
                            <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-700 font-medium">
                        {row.specialSavings > 0 ? (
                            <span className="text-green-600">₦{row.specialSavings.toFixed(2)}</span>
                        ) : row.specialSavings < 0 ? (
                            <span className="text-red-500">-₦{Math.abs(row.specialSavings).toFixed(2)}</span>
                        ) : (
                            <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-2">Summary</h3>
          <p className="text-gray-600 text-sm">
            Based on {stats.count} recorded transaction{stats.count !== 1 && 's'} in the system.
          </p>
        </div>
      )}
    </div>
  );
};

