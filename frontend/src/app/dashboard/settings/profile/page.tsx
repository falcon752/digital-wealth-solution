'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import DashboardHeader from '@/components/layout/DashboardHeader';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';

export default function EditProfilePage() {
  const { user } = useAuth();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setEmail(user.email || ''); // Email is read-only
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await api.put('/api/users/profile', {
        firstName,
        lastName
      });
      toast.success(res.data.message || 'Profile updated successfully');
      // A page reload or context refresh could happen here if needed
      // window.location.reload(); 
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-[#0f172a] pb-20">
      <DashboardHeader title="Edit Profile" />

      <form onSubmit={handleSubmit} className="p-4 flex-1 mt-2">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-5 space-y-5">
          
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-900 dark:text-white">
              First Name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full bg-[#f4f5f8] dark:bg-gray-900 border-none rounded-xl px-4 py-3.5 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-900 dark:text-white">
              Last Name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full bg-[#f4f5f8] dark:bg-gray-900 border-none rounded-xl px-4 py-3.5 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-900 dark:text-white">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              readOnly
              className="w-full bg-[#f4f5f8] dark:bg-gray-900 border-none rounded-xl px-4 py-3.5 text-sm font-medium text-gray-500 dark:text-gray-400 opacity-70"
            />
            <p className="text-xs text-gray-500 mt-1">Email address cannot be changed.</p>
          </div>

          <Button
            type="submit"
            isLoading={isSubmitting}
            className="w-full py-4 text-[15px] font-bold mt-4"
          >
            Save Changes
          </Button>

        </div>
      </form>
    </div>
  );
}
