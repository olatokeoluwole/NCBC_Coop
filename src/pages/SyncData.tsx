import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/authContext';
import { db } from '../lib/firebase';
import { collection, getDocs, addDoc, writeBatch, doc } from 'firebase/firestore';
import Papa from 'papaparse';
import { Loader2, Download, Upload, FileType, Plus, RefreshCw } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export const SyncData = () => {
  const { profile } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'csv' | 'manual'>('csv');
  const [loading, setLoading] = useState(false);
  const [csvError, setCsvError] = useState('');
  const [csvSuccess, setCsvSuccess] = useState('');

  // Manual Form State
  const [txForm, setTxForm] = useState({
    userId: '', amount: 0, particulars: '', ref: '',
    shares: { dr: 0, cr: 0 },
    saving: { dr: 0, cr: 0 },
    loans: { dr: 0, cr: 0 },
    loanInterest: { dr: 0, cr: 0 },
    specialSavings: { dr: 0, cr: 0 }
  });

  useEffect(() => {
    if (profile?.role === 'admin') {
      getDocs(collection(db, 'users')).then(snap => {
         setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    }
  }, [profile]);

  if (profile?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-gray-500">
        <h2 className="text-xl font-bold text-gray-900">Access Denied</h2>
        <p>You must be an admin to access Sync Data.</p>
      </div>
    );
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'transactions'), {
        ...txForm,
        createdAt: new Date()
      });
      alert('Transaction saved successfully!');
      setTxForm({
        userId: '', amount: 0, particulars: '', ref: '',
        shares: { dr: 0, cr: 0 },
        saving: { dr: 0, cr: 0 },
        loans: { dr: 0, cr: 0 },
        loanInterest: { dr: 0, cr: 0 },
        specialSavings: { dr: 0, cr: 0 }
      });
    } catch (err) {
      console.error(err);
      alert('Error creating transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvError('');
    setCsvSuccess('');
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        if (rows.length === 0) {
           setCsvError('CSV file is empty.');
           return;
        }

        const requiredHeaders = ['UserEmail', 'Amount', 'Date', 'Ref', 'Particulars'];
        const actualHeaders = Object.keys(rows[0]);
        const missing = requiredHeaders.filter(h => !actualHeaders.includes(h));
        if (missing.length > 0) {
           setCsvError(`Missing required headers: ${missing.join(', ')}`);
           return;
        }

        setLoading(true);
        try {
          const batch = writeBatch(db);
          let successCount = 0;
          
          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const uMail = (row.UserEmail || '').trim().toLowerCase();
            const matchedUser = users.find(u => (u.email || '').toLowerCase() === uMail);
            
            if (!matchedUser) {
              throw new Error(`Row ${i + 1}: No user found with email "${row.UserEmail}"`);
            }

            const parseNum = (val: any) => {
              const parsed = parseFloat(val);
              return isNaN(parsed) ? 0 : parsed;
            };

            // Attempt to parse date, default to current time
            let parsedDate = new Date();
            if (row.Date && row.Date.trim() !== '') {
               const attemptedDate = new Date(row.Date);
               if (!isNaN(attemptedDate.getTime())) {
                 parsedDate = attemptedDate;
               }
            }

            const txData = {
              userId: matchedUser.id,
              amount: parseNum(row.Amount),
              particulars: row.Particulars || '',
              ref: row.Ref || '',
              saving: {
                dr: parseNum(row.Saving_Dr),
                cr: parseNum(row.Saving_Cr)
              },
              shares: {
                dr: parseNum(row.Shares_Dr),
                cr: parseNum(row.Shares_Cr)
              },
              loans: {
                dr: parseNum(row.Loans_Dr),
                cr: parseNum(row.Loans_Cr)
              },
              loanInterest: {
                dr: parseNum(row.LoanInterest_Dr),
                cr: parseNum(row.LoanInterest_Cr)
              },
              specialSavings: {
                dr: parseNum(row.SpecialSavings_Dr),
                cr: parseNum(row.SpecialSavings_Cr)
              },
              createdAt: parsedDate
            };

            const docRef = doc(collection(db, 'transactions'));
            batch.set(docRef, txData);
            successCount++;
          }
          
          await batch.commit();
          setCsvSuccess(`Successfully imported ${successCount} transactions!`);
          e.target.value = ''; // Reset file input
        } catch (err: any) {
          console.error(err);
          setCsvError(err.message || 'Error processing CSV batch.');
        } finally {
          setLoading(false);
        }
      },
      error: (err) => {
        setCsvError(`CSV Parse error: ${err.message}`);
      }
    });
  };

  const downloadTemplate = () => {
    const headers = [
      'UserEmail', 'Date', 'Amount', 'Ref', 'Particulars', 
      'Shares_Dr', 'Shares_Cr',
      'Saving_Dr', 'Saving_Cr',
      'Loans_Dr', 'Loans_Cr',
      'LoanInterest_Dr', 'LoanInterest_Cr',
      'SpecialSavings_Dr', 'SpecialSavings_Cr'
    ];
    const csvContent = headers.join(',') + '\n' + 
      'example@gmail.com,2026-08-01,1500,DEP-001,Monthly Contribution,0,500,0,1000,0,0,0,0,0,0\n';
      
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'coop_transaction_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Sync Data</h2>
        <p className="text-sm text-gray-500">Insert new transactions manually or batch upload them via CSV.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
         <div className="flex border-b border-gray-200 bg-gray-50">
            <button
              onClick={() => setActiveTab('csv')}
              className={cn(
                'flex-1 py-3 text-sm font-medium border-b-2 flex justify-center items-center gap-2 transition-colors',
                activeTab === 'csv' ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              )}
            >
              <FileType className="w-4 h-4" /> CSV Upload Layer
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={cn(
                'flex-1 py-3 text-sm font-medium border-b-2 flex justify-center items-center gap-2 transition-colors',
                activeTab === 'manual' ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              )}
            >
              <Plus className="w-4 h-4" /> Manual Entry Form
            </button>
         </div>

         <div className="p-6 md:p-8">
           {activeTab === 'csv' && (
             <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                  <div>
                    <h3 className="font-semibold text-blue-900">Bulk Import via CSV</h3>
                    <p className="text-sm text-blue-700/80 mt-1">Download the strict template, fill it offline, and upload it here.</p>
                  </div>
                  <button 
                    onClick={downloadTemplate}
                    className="flex shrink-0 items-center gap-2 bg-white border border-blue-200 shadow-sm text-blue-700 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors text-sm"
                  >
                    <Download className="w-4 h-4" /> Download Template
                  </button>
                </div>

                {csvError && <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm font-medium">{csvError}</div>}
                {csvSuccess && <div className="p-4 bg-green-50 text-green-700 rounded-lg text-sm font-medium">{csvSuccess}</div>}

                <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:bg-gray-50 transition-colors cursor-pointer relative group">
                   <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3 group-hover:text-blue-500 transition-colors" />
                   <p className="font-medium text-gray-900">Click or drag a CSV file to upload</p>
                   <p className="text-sm text-gray-500 mt-1">Must strictly follow the 15-column template</p>
                   {loading && (
                     <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl backdrop-blur-sm">
                       <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                     </div>
                   )}
                   <input 
                     type="file" 
                     accept=".csv" 
                     onChange={handleFileUpload} 
                     disabled={loading}
                     className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" 
                   />
                </div>
             </div>
           )}

           {activeTab === 'manual' && (
              <form onSubmit={handleManualSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                    <select required value={txForm.userId} onChange={e => setTxForm({...txForm, userId: e.target.value})} className="w-full border border-gray-300 p-2.5 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                      <option value="">Select User</option>
                      {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                    <input type="number" step="0.01" placeholder="0.00" required value={txForm.amount} onChange={e => setTxForm({...txForm, amount: parseFloat(e.target.value) || 0})} className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ref Number</label>
                    <input type="text" placeholder="e.g. TRC-12001" required value={txForm.ref} onChange={e => setTxForm({...txForm, ref: e.target.value})} className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="lg:col-span-3 border-t border-gray-100 pt-4 mt-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Particulars / Description</label>
                    <input type="text" placeholder="e.g. Monthly Contribution" required value={txForm.particulars} onChange={e => setTxForm({...txForm, particulars: e.target.value})} className="w-full border border-gray-300 p-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>

                <div className="space-y-4">
                {[
                  { key: 'shares', label: 'Shares' },
                  { key: 'saving', label: 'Savings' },
                  { key: 'loans', label: 'Loans' },
                  { key: 'loanInterest', label: 'Loan Interest' },
                  { key: 'specialSavings', label: 'Special Savings' }
                ].map(({ key: category, label }) => (
                  <div key={category} className="grid grid-cols-3 gap-4 items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="font-semibold text-sm text-gray-800">{label}</div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Debit (Dr)</label>
                      <input type="number" step="0.01" value={(txForm as any)[category].dr} onChange={e => setTxForm({...txForm, [category]: { ...(txForm as any)[category], dr: parseFloat(e.target.value) || 0 }})} className="w-full border border-gray-300 p-2 rounded-md text-sm outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Credit (Cr)</label>
                      <input type="number" step="0.01" value={(txForm as any)[category].cr} onChange={e => setTxForm({...txForm, [category]: { ...(txForm as any)[category], cr: parseFloat(e.target.value) || 0 }})} className="w-full border border-gray-300 p-2 rounded-md text-sm outline-none focus:border-blue-500" />
                    </div>
                  </div>
                ))}
                </div>

                <div className="flex justify-end gap-3 pt-6">
                  <button type="submit" disabled={loading} className="px-6 py-2.5 text-sm bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors">
                    {loading && <Loader2 className="w-4 h-4 animate-spin"/>}
                    Submit Transaction
                  </button>
                </div>
             </form>
           )}
         </div>
      </div>
    </div>
  );
};
