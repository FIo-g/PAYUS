// src/pages/auth/LoginPage.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';

const schema = z.object({
  email: z.string().email('유효한 이메일을 입력하세요.'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.'),
});

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await login(data.email, data.password);
      toast.success(`환영합니다, ${res.data.name}님!`);
      navigate(res.data.role === 'merchant' ? '/merchant/home' : '/home');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center px-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-primary-600">세종페이</h1>
        <p className="text-gray-500 mt-2">고려대학교 세종캠퍼스 간편결제</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="이메일"
          type="email"
          placeholder="student@korea.ac.kr"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="비밀번호"
          type="password"
          placeholder="8자 이상"
          error={errors.password?.message}
          {...register('password')}
        />
        <Button type="submit" disabled={loading}>
          {loading ? '로그인 중...' : '로그인'}
        </Button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        아직 계정이 없으신가요?{' '}
        <Link to="/register" className="text-primary-600 font-semibold">
          회원가입
        </Link>
      </p>
    </div>
  );
}
