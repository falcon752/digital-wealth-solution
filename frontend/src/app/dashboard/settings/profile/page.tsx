'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usersAPI } from '@/lib/api';
import DashboardHeader from '@/components/layout/DashboardHeader';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { User as UserIcon } from 'lucide-react';
import Image from 'next/image';

export default function EditProfilePage() {
  const { user } = useAuth();
  
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('United States');
  
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setFullName(`${user.firstName || ''} ${user.lastName || ''}`.trim());
      setUsername(user.username || '');
      setEmail(user.email || '');
      setPhoneNumber(user.phoneNumber || '');
      setAddress(user.address || '');
      setCity(user.city || '');
      setState(user.state || '');
      if (user.country) setCountry(user.country);
      if (user.profileImage) setPreviewImage(`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}/uploads/${user.profileImage}`);
    }
  }, [user]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileImage(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const parts = fullName.trim().split(' ');
      const firstName = parts[0] || '';
      const lastName = parts.slice(1).join(' ') || '';

      const formData = new FormData();
      formData.append('firstName', firstName);
      formData.append('lastName', lastName);
      formData.append('username', username);
      formData.append('phoneNumber', phoneNumber);
      formData.append('address', address);
      formData.append('city', city);
      formData.append('state', state);
      formData.append('country', country);
      
      if (profileImage) {
        formData.append('profileImage', profileImage);
      }

      const res = await usersAPI.updateProfile(formData);
      toast.success(res.data.message || 'Profile updated successfully');
      
      // Update local storage or trigger auth refresh if your context supports it
      setTimeout(() => {
        window.location.reload(); 
      }, 1500);
    } catch (error: any) {
      const msg = error.response?.data?.error || error.response?.data?.errors?.[0]?.msg || 'Failed to update profile';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f4f5f8] dark:bg-[#181818] pb-20">
      <DashboardHeader title="Edit Profile" />

      <form onSubmit={handleSubmit} className="p-4 flex-1">
        
        {/* User Card */}
        <div className="bg-white dark:bg-[#454545] rounded-3xl p-5 flex items-center gap-4 shadow-sm mb-6">
          <div className="w-16 h-16 rounded-full bg-orange-100 overflow-hidden flex items-center justify-center shrink-0 border border-gray-100 dark:border-gray-700">
            {previewImage ? (
              <img src={previewImage} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="text-orange-400" size={32} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[17px] font-semibold text-gray-900 dark:text-white truncate">
              {fullName || 'Loading...'}
            </h2>
            <p className="text-[14px] text-gray-500 dark:text-gray-400 truncate underline decoration-gray-300 dark:decoration-gray-600 underline-offset-2 mt-0.5">
              {email}
            </p>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-5">
          
          <div className="space-y-2">
            <label className="text-[15px] font-semibold text-gray-900 dark:text-white ml-1">
              Upload Image
            </label>
            <div className="flex items-center gap-3">
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-[13px] font-medium px-4 py-2 rounded-full"
              >
                Choose File
              </button>
              <span className="text-[13px] text-gray-500 dark:text-gray-400">
                {profileImage ? profileImage.name : 'no file selected'}
              </span>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/*"
                className="hidden"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[15px] font-semibold text-gray-900 dark:text-white ml-1">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-white dark:bg-[#454545] border-none rounded-2xl px-4 py-4 text-[15px] font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 shadow-sm"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-[15px] font-semibold text-gray-900 dark:text-white ml-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-white dark:bg-[#454545] border-none rounded-2xl px-4 py-4 text-[15px] font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[15px] font-semibold text-gray-900 dark:text-white ml-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              readOnly
              className="w-full bg-white dark:bg-[#454545] border-none rounded-2xl px-4 py-4 text-[15px] font-medium text-gray-900 dark:text-white opacity-80 shadow-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[15px] font-semibold text-gray-900 dark:text-white ml-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full bg-white dark:bg-[#454545] border-none rounded-2xl px-4 py-4 text-[15px] font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[15px] font-semibold text-gray-900 dark:text-white ml-1">
              Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-white dark:bg-[#454545] border-none rounded-2xl px-4 py-4 text-[15px] font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[15px] font-semibold text-gray-900 dark:text-white ml-1">
              City
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full bg-white dark:bg-[#454545] border-none rounded-2xl px-4 py-4 text-[15px] font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[15px] font-semibold text-gray-900 dark:text-white ml-1">
              State
            </label>
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full bg-white dark:bg-[#454545] border-none rounded-2xl px-4 py-4 text-[15px] font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[15px] font-semibold text-gray-900 dark:text-white ml-1">
              Country
            </label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full bg-white dark:bg-[#454545] border-none rounded-2xl px-4 py-4 text-[15px] font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>

          <Button
            type="submit"
            loading={isSubmitting}
            className="w-full py-4 rounded-xl text-[16px] font-medium bg-[#6366f1] hover:bg-[#4f46e5] text-white mt-8"
          >
            Save Changes
          </Button>

        </div>
      </form>
    </div>
  );
}
