'use client';

import AdminLoginForm from '@/components/admin/AdminLoginForm';
import AuthLayout from './AuthLayout';

export default function AdminLoginPage() {
  return (
    <AuthLayout
      title="Admin Sign In"
      subtitle="Restricted access. Authorized Digital Wealth Partners administrators only."
    >
      <AdminLoginForm />
    </AuthLayout>
  );
}
