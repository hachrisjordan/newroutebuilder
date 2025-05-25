import dynamic from 'next/dynamic';

// Dynamically import AuthForm for code splitting and optimization
const AuthForm = dynamic(() => import('@/components/auth-wizard/auth-form'), { ssr: false });

export default function AuthPage() {
  return <AuthForm />;
} 