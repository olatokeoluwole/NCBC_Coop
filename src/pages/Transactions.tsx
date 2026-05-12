import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../lib/authContext';
import { collection, query, where, onSnapshot, orderBy, serverTimestamp, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Loader2, Plus, Receipt, Upload, Eye, Search, Calendar, Download, FileText, FileSpreadsheet, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const Transactions = () => {
  const { profile, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  
  // Admin Filter States
  const [emailFilter, setEmailFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals state
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [users, setUsers] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);

  // Receipt Form (Standard user predominantly)
  const [fileData, setFileData] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [fileError, setFileError] = useState('');

  useEffect(() => {
    if (!profile || !user) return;

    let q;
    let rQ;
    if (profile.role === 'admin') {
      q = query(collection(db, 'transactions'), orderBy('createdAt', 'asc'));
      rQ = query(collection(db, 'receipts'), orderBy('createdAt', 'desc'));
    } else {
      q = query(collection(db, 'transactions'), where('userId', '==', user.uid), orderBy('createdAt', 'asc'));
      rQ = query(collection(db, 'receipts'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
    }

    const unsubscribeTxs = onSnapshot(q, (snapshot) => {
      let rawData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      
      const userBalances: Record<string, { saving: number, shares: number, loans: number, loanInterest: number, specialSavings: number }> = {};
      
      const processedData = rawData.map(tx => {
        const uid = tx.userId;
        if (!userBalances[uid]) {
           userBalances[uid] = { saving: 0, shares: 0, loans: 0, loanInterest: 0, specialSavings: 0 };
        }
        const ub = userBalances[uid];
        ub.saving += (tx.saving?.cr || 0) - (tx.saving?.dr || 0);
        ub.shares += (tx.shares?.cr || 0) - (tx.shares?.dr || 0);
        ub.loans += (tx.loans?.dr || 0) - (tx.loans?.cr || 0); // Dr increases loan, Cr decreases
        ub.loanInterest += (tx.loanInterest?.dr || 0) - (tx.loanInterest?.cr || 0);
        ub.specialSavings += (tx.specialSavings?.cr || 0) - (tx.specialSavings?.dr || 0);

        return {
          ...tx,
          computedBalances: {
            saving: ub.saving,
            shares: ub.shares,
            loans: ub.loans,
            loanInterest: ub.loanInterest,
            specialSavings: ub.specialSavings
          }
        };
      });

      // Display newest first
      processedData.reverse();

      setTransactions(processedData);
      setLoading(false);
    });

    const unsubscribeReceipts = onSnapshot(rQ, (snapshot) => {
      setReceipts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    if (profile.role === 'admin') {
      getDocs(collection(db, 'users')).then(snap => {
         setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    }

    return () => { unsubscribeTxs(); unsubscribeReceipts(); };
  }, [profile, user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
      setFileError('Only PDF files are allowed');
      return;
    }
    
    if (file.size > 700000) { // Limit to 700KB
      setFileError('File size must be under 700KB');
      return;
    }

    setFileError('');
    setFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') {
        setFileData(ev.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleReceiptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileData || !fileName || !user) return;
    
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'receipts'), {
        userId: user.uid,
        fileData,
        fileName,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setShowReceiptModal(false);
      setFileData('');
      setFileName('');
      alert('Receipt uploaded successfully. Pending admin approval.');
    } catch (err) {
      console.error(err);
      alert("Error uploading receipt");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleReceiptStatus = async (receiptId: string, currentStatus: string) => {
    if (profile?.role !== 'admin') return;
    const newStatus = currentStatus === 'pending' ? 'seen' : 'pending';
    try {
      await updateDoc(doc(db, 'receipts', receiptId), {
        status: newStatus
      });
    } catch (err) {
      console.error(err);
      alert('Failed to update receipt status');
    }
  };

  const handleClearAllReceipts = async () => {
    if (profile?.role !== 'admin') return;
    if (!confirm('Are you sure you want to completely clear ALL pending receipts? This cannot be undone.')) return;
    
    setSubmitting(true);
    try {
      // Loop over receipts state directly and delete each document
      for (const r of receipts) {
        await deleteDoc(doc(db, 'receipts', r.id));
      }
      alert('All receipts cleared successfully.');
    } catch (err) {
      console.error(err);
      alert('Failed to clear receipts');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    let result = transactions;
    if (profile?.role === 'admin' && emailFilter) {
      const lower = emailFilter.toLowerCase().trim();
      result = result.filter(tx => {
        const uEmail = (users.find(u => u.id === tx.userId)?.email || '').replace('@coop.local', '');
        return uEmail.toLowerCase().includes(lower);
      });
    }
    if (startDate) {
      const start = new Date(startDate).getTime();
      result = result.filter(tx => tx.createdAt && tx.createdAt.toMillis() >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter(tx => tx.createdAt && tx.createdAt.toMillis() <= end.getTime());
    }
    return result;
  }, [transactions, profile, emailFilter, startDate, endDate, users]);

  const handleDownloadCSV = () => {
    if (!filteredTransactions.length) return alert('No data to download.');
    
    const headers = [
      'Date', 
      ...(profile?.role === 'admin' ? ['Username / Email'] : []),
      'Amount', 'Particulars', 'Ref',
      'Shares Dr', 'Shares Cr', 'Shares Bal',
      'Saving Dr', 'Saving Cr', 'Saving Bal',
      'Loans Dr', 'Loans Cr', 'Loans Bal',
      'Loan Interest Dr', 'Loan Interest Cr', 'Loan Interest Bal',
      'Special Savings Dr', 'Special Savings Cr', 'Special Savings Bal'
    ];

    const rows = filteredTransactions.map(tx => {
      const dateStr = tx.createdAt?.toDate ? format(tx.createdAt.toDate(), 'yyyy-MM-dd') : 'Pending';
      const uEmail = (users.find(u => u.id === tx.userId)?.email || tx.userId).replace('@coop.local', '');
      
      const parts = [
        dateStr,
        ...(profile?.role === 'admin' ? [uEmail] : []),
        (tx.amount || 0).toFixed(2),
        `"${(tx.particulars || '').replace(/"/g, '""')}"`,
        `"${(tx.ref || '').replace(/"/g, '""')}"`,
        tx.shares?.dr || 0, tx.shares?.cr || 0, tx.computedBalances?.shares || 0,
        tx.saving?.dr || 0, tx.saving?.cr || 0, tx.computedBalances?.saving || 0,
        tx.loans?.dr || 0, tx.loans?.cr || 0, tx.computedBalances?.loans || 0,
        tx.loanInterest?.dr || 0, tx.loanInterest?.cr || 0, tx.computedBalances?.loanInterest || 0,
        tx.specialSavings?.dr || 0, tx.specialSavings?.cr || 0, tx.computedBalances?.specialSavings || 0
      ];
      return parts.join(',');
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Transactions_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPDF = () => {
    if (!filteredTransactions.length) return alert('No data to download.');

    const doc = new jsPDF({ orientation: 'landscape' });
    
    doc.setFontSize(16);
    doc.text('Co-op Society Transactions', 14, 20);
    
    doc.setFontSize(10);
    doc.text(`Generated on: ${format(new Date(), 'MMM d, yyyy HH:mm')}`, 14, 28);

    const headers = [
      [
        'Date', 
        ...(profile?.role === 'admin' ? ['User'] : []),
        'Amount', 'Particulars', 
        'Shares', 'Savings', 'Loans', 'Interest', 'Sp. Savings'
      ]
    ];

    const body = filteredTransactions.map(tx => {
      const dateStr = tx.createdAt?.toDate ? format(tx.createdAt.toDate(), 'MMM d, yyyy') : 'Pending';
      const uEmail = (users.find(u => u.id === tx.userId)?.email || tx.userId).replace('@coop.local', '');
      
      return [
        dateStr,
        ...(profile?.role === 'admin' ? [uEmail] : []),
        `₦${(tx.amount || 0).toFixed(2)}`,
        tx.particulars || '',
        `Bal: ${(tx.computedBalances?.shares || 0).toFixed(2)}`,
        `Bal: ${(tx.computedBalances?.saving || 0).toFixed(2)}`,
        `Bal: ${(tx.computedBalances?.loans || 0).toFixed(2)}`,
        `Bal: ${(tx.computedBalances?.loanInterest || 0).toFixed(2)}`,
        `Bal: ${(tx.computedBalances?.specialSavings || 0).toFixed(2)}`
      ];
    });

    autoTable(doc, {
      head: headers,
      body: body,
      startY: 35,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [63, 131, 248] }, // Blue-500 equivalent
    });

    doc.save(`Transactions_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  const renderNestedHeader = (title: string) => (
    <th className="px-3 py-2 border-l border-gray-200 text-center align-top min-w-[150px]">
      <div className="border-b border-gray-200 pb-2 mb-2">{title}</div>
      <div className="grid grid-cols-3 gap-2 text-xs font-semibold px-2">
        <span>Dr</span>
        <span>Cr</span>
        <span>Bal</span>
      </div>
    </th>
  );

  const renderNestedData = (dr: number, cr: number, balance: number) => (
    <td className="px-3 py-4 border-l border-gray-100 text-center min-w-[150px]">
      <div className="grid grid-cols-3 gap-2 text-xs px-2">
        <span className={dr > 0 ? "text-red-600 font-medium" : "text-gray-400"}>{dr > 0 ? dr.toFixed(2) : '-'}</span>
        <span className={cr > 0 ? "text-green-600 font-medium" : "text-gray-400"}>{cr > 0 ? cr.toFixed(2) : '-'}</span>
        <span className="font-medium text-gray-900">{balance.toFixed(2)}</span>
      </div>
    </td>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Transactions</h2>
          <p className="text-sm text-gray-500">View ledger history and upload receipts.</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors text-sm shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" /> CSV
          </button>
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors text-sm shadow-sm"
          >
            <FileText className="w-4 h-4" /> PDF
          </button>
          {profile?.role !== 'admin' && (
            <button
              onClick={() => setShowReceiptModal(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm shadow-sm"
            >
              <Upload className="w-4 h-4" />
              Receipt Upload
            </button>
          )}
        </div>
      </div>

      {profile?.role === 'admin' && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full relative">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Username / Email</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={emailFilter}
                onChange={e => setEmailFilter(e.target.value)}
                placeholder="Search username or email..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
          <div className="w-full md:w-48 relative">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Start Date</label>
            <div className="relative">
               <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
               <input
                 type="date"
                 value={startDate}
                 onChange={e => setStartDate(e.target.value)}
                 className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
               />
            </div>
          </div>
          <div className="w-full md:w-48 relative">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">End Date</label>
            <div className="relative">
               <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
               <input
                 type="date"
                 value={endDate}
                 onChange={e => setEndDate(e.target.value)}
                 className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
               />
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="min-w-full text-left text-sm whitespace-nowrap">
          <thead className="uppercase tracking-wider border-b border-gray-200 bg-gray-50 text-gray-500">
            <tr>
              <th className="px-4 py-4 font-medium align-top">Date</th>
              {profile?.role === 'admin' && (
                <th className="px-4 py-4 font-medium align-top">Username / Email</th>
              )}
              <th className="px-4 py-4 font-medium align-top">Amount</th>
              <th className="px-4 py-4 font-medium align-top">Particulars</th>
              <th className="px-4 py-4 font-medium align-top">Ref</th>
              {renderNestedHeader('Shares')}
              {renderNestedHeader('Saving')}
              {renderNestedHeader('Loans')}
              {renderNestedHeader('Loan Interest')}
              {renderNestedHeader('Special Savings')}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {filteredTransactions.length === 0 && (
              <tr>
                <td colSpan={11} className="px-6 py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Receipt className="w-8 h-8 text-gray-300" />
                    <p>No transactions found.</p>
                  </div>
                </td>
              </tr>
            )}
            {filteredTransactions.map(tx => (
              <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-4">
                  {tx.createdAt?.toDate ? format(tx.createdAt.toDate(), 'MMM d, yyyy') : 'Pending'}
                </td>
                {profile?.role === 'admin' && (
                  <td className="px-4 py-4 text-gray-500">
                    {(users.find(u => u.id === tx.userId)?.email || tx.userId).replace('@coop.local', '')}
                  </td>
                )}
                <td className="px-4 py-4 font-medium text-gray-900">₦{(tx.amount || 0).toFixed(2)}</td>
                <td className="px-4 py-4 max-w-[150px] truncate" title={tx.particulars}>{tx.particulars}</td>
                <td className="px-4 py-4 font-mono text-xs">{tx.ref}</td>
                {renderNestedData(tx.shares?.dr || 0, tx.shares?.cr || 0, tx.computedBalances?.shares || 0)}
                {renderNestedData(tx.saving?.dr || 0, tx.saving?.cr || 0, tx.computedBalances?.saving || 0)}
                {renderNestedData(tx.loans?.dr || 0, tx.loans?.cr || 0, tx.computedBalances?.loans || 0)}
                {renderNestedData(tx.loanInterest?.dr || 0, tx.loanInterest?.cr || 0, tx.computedBalances?.loanInterest || 0)}
                {renderNestedData(tx.specialSavings?.dr || 0, tx.specialSavings?.cr || 0, tx.computedBalances?.specialSavings || 0)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {receipts.length > 0 && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">{profile?.role === 'admin' ? 'Pending User Receipts' : 'My Uploaded Receipts'}</h3>
            {profile?.role === 'admin' && (
              <button 
                onClick={handleClearAllReceipts} 
                disabled={submitting}
                className="flex items-center gap-1 text-sm bg-red-50 text-red-600 px-3 py-1.5 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Clear all receipts
              </button>
            )}
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
             <table className="min-w-full text-left text-sm whitespace-nowrap">
               <thead className="bg-gray-50 border-b border-gray-200">
                 <tr>
                   <th className="px-4 py-3">Date</th>
                   {profile?.role === 'admin' && <th className="px-4 py-3">User</th>}
                   <th className="px-4 py-3">File</th>
                   <th className="px-4 py-3">Status</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                 {receipts.map(r => (
                   <tr key={r.id}>
                     <td className="px-4 py-3">{r.createdAt?.toDate ? format(r.createdAt.toDate(), 'MMM d') : ''}</td>
                     {profile?.role === 'admin' && (
                       <td className="px-4 py-3">{users.find(u => u.id === r.userId)?.name || r.userId}</td>
                     )}
                     <td className="px-4 py-3">
                       <a href={r.fileData} download={r.fileName} className="text-blue-600 hover:underline flex items-center gap-1">
                          <Eye className="w-4 h-4"/> {r.fileName}
                       </a>
                     </td>
                     <td className="px-4 py-3 capitalize">
                       {profile?.role === 'admin' ? (
                         <button 
                           onClick={() => handleToggleReceiptStatus(r.id, r.status)}
                           className={`px-2 py-1 rounded text-xs font-medium transition-colors hover:opacity-80 cursor-pointer ${
                             r.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                           }`}
                         >
                           {r.status}
                         </button>
                       ) : (
                         <span className={`px-2 py-1 rounded text-xs font-medium ${
                           r.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                         }`}>
                           {r.status}
                         </span>
                       )}
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        </div>
      )}

      {/* Receipt Upload Modal (Standard User) */}
      {showReceiptModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Upload Receipt for Approval</h3>
            <form onSubmit={handleReceiptSubmit} className="space-y-4">
              <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Select PDF Receipt</label>
                 <input 
                   type="file" 
                   accept=".pdf"
                   required
                   onChange={handleFileChange}
                   className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                 />
                 {fileError && <p className="text-red-500 text-xs mt-1">{fileError}</p>}
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowReceiptModal(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
                <button type="submit" disabled={submitting || !!fileError || !fileData} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md disabled:opacity-50 flex items-center gap-2">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin"/>}
                  Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
