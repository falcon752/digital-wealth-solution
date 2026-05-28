'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { usersAPI } from '@/lib/api';

export default function SecuritySettingsPage() {
  const [loading, setLoading] = useState(false);
  
  // Password visibility toggles
  const [showPasscode, setShowPasscode] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const pwForm = useForm({ defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' } });

  const changePassword = async (data: any) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }
    setLoading(true);
    try {
      await usersAPI.changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword });
      pwForm.reset();
      toast.success('Password changed successfully!');
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to update password';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col bg-white dark:bg-gray-900 pb-20">
      
      {/* Header */}
      <header className="flex items-center px-4 py-4 bg-white dark:bg-gray-900 sticky top-0 z-10">
        <Link href="/dashboard/settings" className="text-gray-900 dark:text-white p-1 absolute left-4">
          <ArrowLeft size={22} />
        </Link>
        <h1 className="flex-1 text-center font-bold text-gray-900 dark:text-white text-[17px]">
          Security Settings
        </h1>
      </header>

      <div className="flex-1 px-5 mt-4">
        
        <p className="text-center text-[15px] font-medium text-gray-600 dark:text-gray-400 mb-8 px-4">
          Change or edit your password and passcode.
        </p>

        <form onSubmit={pwForm.handleSubmit(changePassword)} className="space-y-6">
          
          {/* Passcode (Placeholder UI based on screenshot) */}
          <div className="space-y-2">
            <label className="text-[14px] font-bold text-gray-900 dark:text-white ml-1">
              Your Six Digit Passcode
            </label>
            <div className="relative">
              <input 
                type={showPasscode ? "text" : "password"}
                placeholder="Enter six-digit passcode"
                maxLength={6}
                className="w-full bg-[#f4f5f8] dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-[#a0a8b9] font-medium text-[15px] py-4 pl-4 pr-12 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <button 
                type="button" 
                onClick={() => setShowPasscode(!showPasscode)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showPasscode ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>
            </div>
          </div>

          {/* Current Password */}
          <div className="space-y-2">
            <label className="text-[14px] font-bold text-gray-900 dark:text-white ml-1">
              Current Password
            </label>
            <div className="relative">
              <input 
                type={showCurrent ? "text" : "password"}
                placeholder="Enter current password"
                {...pwForm.register('currentPassword', { required: true })}
                className="w-full bg-[#f4f5f8] dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-[#a0a8b9] font-medium text-[15px] py-4 pl-4 pr-12 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <button 
                type="button" 
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showCurrent ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <label className="text-[14px] font-bold text-gray-900 dark:text-white ml-1">
              New Password
            </label>
            <div className="relative">
              <input 
                type={showNew ? "text" : "password"}
                placeholder="Enter new password"
                {...pwForm.register('newPassword', { required: true })}
                className="w-full bg-[#f4f5f8] dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-[#a0a8b9] font-medium text-[15px] py-4 pl-4 pr-12 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <button 
                type="button" 
                onClick={() => setShowNew(!showNew)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showNew ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div className="space-y-2">
            <label className="text-[14px] font-bold text-gray-900 dark:text-white ml-1">
              Confirm New Password
            </label>
            <div className="relative">
              <input 
                type={showNew ? "text" : "password"}
                placeholder="Confirm new password"
                {...pwForm.register('confirmPassword', { required: true })}
                className="w-full bg-[#f4f5f8] dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-[#a0a8b9] font-medium text-[15px] py-4 pl-4 pr-12 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="pt-4">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full flex items-center justify-center bg-blue-600 dark:bg-blue-500 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Confirm Changes'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
