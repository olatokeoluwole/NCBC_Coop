import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/authContext';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Loader2, ShieldAlert, Trash2, UserPlus } from 'lucide-react';

export const UsersPage = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Combined list of active and pending
  const [usersList, setUsersList] = useState<any[]>([]);
  const [pendingList, setPendingList] = useState<any[]>([]);
  
  // Form State
  const [inviteIdentifier, setInviteIdentifier] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('standard');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (profile?.role !== 'admin') return;

    const qUsers = query(collection(db, 'users'));
    const unUsers = onSnapshot(qUsers, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsersList(data);
      setLoading(false);
    });

    const qPending = query(collection(db, 'pre_registered'));
    const unPending = onSnapshot(qPending, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), isPending: true }));
      setPendingList(data);
    });

    return () => {
      unUsers();
      unPending();
    };
  }, [profile]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteIdentifier || !inviteName) return;
    setIsSubmitting(true);
    try {
      const finalEmail = inviteIdentifier.includes('@') 
        ? inviteIdentifier.toLowerCase().trim() 
        : `${inviteIdentifier.toLowerCase().trim()}@coop.local`;

      // Check if email already active or pending
      const existsActive = usersList.some(u => u.email.toLowerCase() === finalEmail);
      const existsPending = pendingList.some(p => p.email.toLowerCase() === finalEmail);
      
      if (existsActive || existsPending) {
        alert("This username/email is already registered or pending.");
        setIsSubmitting(false);
        return;
      }

      await addDoc(collection(db, 'pre_registered'), {
        email: finalEmail,
        name: inviteName.trim(),
        role: inviteRole
      });
      
      setInviteIdentifier('');
      setInviteName('');
      setInviteRole('standard');
      alert("User successfully added! They can now sign in.");
    } catch (err) {
      console.error(err);
      alert('Failed to add user. Ensure you have admin permissions.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string, isPending: boolean, email: string) => {
    if (email === 'olatokeoluwole@gmail.com' || email === 'wolefalana@hotmail.com') {
        alert('Cannot change the role of the master admin.');
        return;
    }
    try {
      if (isPending) {
        await updateDoc(doc(db, 'pre_registered', userId), { role: newRole });
      } else {
        await updateDoc(doc(db, 'users', userId), { role: newRole });
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update role');
    }
  };

  const handleDelete = async (userId: string, isPending: boolean, email: string) => {
    if (email === 'olatokeoluwole@gmail.com' || email === 'wolefalana@hotmail.com') {
        alert('Cannot delete the master admin.');
        return;
    }
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      if (isPending) {
        await deleteDoc(doc(db, 'pre_registered', userId));
      } else {
        await deleteDoc(doc(db, 'users', userId));
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete user');
    }
  };

  if (profile?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-gray-500">
        <ShieldAlert className="w-12 h-12 mb-4 text-red-500" />
        <h2 className="text-xl font-bold text-gray-900">Access Denied</h2>
        <p>You must be an admin to view this page.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  // Filter out pending users who have already logged in (active)
  // since logging in creates the users document but leaves the pending document alive.
  const activeEmails = new Set(usersList.map(u => u.email.toLowerCase()));
  const visiblePending = pendingList.filter(p => !activeEmails.has(p.email.toLowerCase()));
  
  const combinedList = [...usersList, ...visiblePending].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Manage Users</h2>
        <p className="text-sm text-gray-500">Assign roles and manage society members.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-blue-600" /> 
          Add New User
        </h3>
        <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input 
              type="text" 
              required
              value={inviteName}
              onChange={e => setInviteName(e.target.value)}
              placeholder="e.g. Jane Doe"
              className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Username or Google Email</label>
            <input 
              type="text" 
              required
              value={inviteIdentifier}
              onChange={e => setInviteIdentifier(e.target.value)}
              placeholder="e.g. javed or javed@gmail.com"
              className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select 
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value)}
              className="w-full border border-gray-300 p-2 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="standard">Standard</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="md:col-span-1">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 text-sm h-[38px]"
            >
              {isSubmitting ? 'Adding...' : 'Add User'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="min-w-full text-left text-sm whitespace-nowrap">
          <thead className="uppercase tracking-wider border-b border-gray-100 bg-gray-50 text-gray-500 font-medium">
            <tr>
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Username / Email</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {combinedList.map(u => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-medium">{u.name}</td>
                <td className="px-6 py-4 text-gray-500">{u.email.replace('@coop.local', '')}</td>
                <td className="px-6 py-4">
                  {u.isPending ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      Pending Sync
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <select
                    value={u.role}
                    disabled={u.email === 'olatokeoluwole@gmail.com' || u.email === 'wolefalana@hotmail.com'}
                    onChange={(e) => handleRoleChange(u.id, e.target.value, !!u.isPending, u.email)}
                    className="rounded text-sm border-gray-300 focus:ring-blue-500 focus:border-blue-500 font-medium bg-gray-50 py-1 px-2 border disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="standard">Standard</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleDelete(u.id, !!u.isPending, u.email)}
                    disabled={u.email === 'olatokeoluwole@gmail.com' || u.email === 'wolefalana@hotmail.com'}
                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Delete User"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
