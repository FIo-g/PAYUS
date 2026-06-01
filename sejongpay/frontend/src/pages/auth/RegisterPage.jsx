// src/pages/auth/RegisterPage.jsx
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
  name: z.string().min(1, '이름을 입력하세요.'),
  email: z.string().email('유효한 이메일을 입력하세요.'),
  studentId: z.string().optional(),
  phone: z.string().regex(/^010-\d{4}-\d{4}$/, '전화번호 형식: 010-0000-0000').optional().or(z.literal('')),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.'),
  confirmPassword: z.string(),
  role: z.enum(['student', 'merchant']),
}).refine((d) => d.password === d.confirmPassword, {
  message: '비밀번호가 일치하지 않습니다.',
  path: ['confirmPassword'],
});

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { role: 'student' },
  });

  const role = watch('role');

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await registerUser(data);
      toast.success('회원가입 완료!');
      navigate(data.role === 'merchant' ? '/merchant/home' : '/home');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || '회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-6 py-8">
      <h1 className="text-2xl font-bold mb-6">회원가입</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* 역할 선택 */}
        <div className="flex gap-3">
          {['student', 'merchant'].map((r) => (
            <label
              key={r}
              className={`flex-1 text-center py-3 rounded-xl border-2 cursor-pointer transition-colors ${
                role === r ? 'border-primary-600 bg-primary-50 text-primary-600' : 'border-gray-200'
              }`}
            >
              <input type="radio" value={r} className="hidden" {...register('role')} />
              {r === 'student' ? '학생' : '가맹점주'}
            </label>
          ))}
        </div>

        <Input label="이름" placeholder="김세종" error={errors.name?.message} {...register('name')} />
        <Input label="이메일" type="email" placeholder="user@korea.ac.kr" error={errors.email?.message} {...register('email')} />
        {role === 'student' && (
          <Input label="학번 (선택)" placeholder="2024100001" error={errors.studentId?.message} {...register('studentId')} />
        )}
        <Input label="전화번호 (선택)" placeholder="010-0000-0000" error={errors.phone?.message} {...register('phone')} />
        <Input label="비밀번호" type="password" placeholder="8자 이상" error={errors.password?.message} {...register('password')} />
        <Input label="비밀번호 확인" type="password" placeholder="비밀번호 재입력" error={errors.confirmPassword?.message} {...register('confirmPassword')} />

        <Button type="submit" disabled={loading}>
          {loading ? '가입 중...' : '가입하기'}
        </Button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        이미 계정이 있으신가요?{' '}
        <Link to="/login" className="text-primary-600 font-semibold">
          로그인
        </Link>
      </p>
    </div>
  );
}
