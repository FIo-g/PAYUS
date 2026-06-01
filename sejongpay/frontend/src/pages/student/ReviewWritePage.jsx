// src/pages/student/ReviewWritePage.jsx
// 리뷰 작성 화면 (화면 12)

import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { merchantService } from '../../services/merchant.service';
import { PageLayout } from '../../components/layout/PageLayout';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';

export default function ReviewWritePage() {
  const { merchantId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();

  const [rating, setRating] = useState(0);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const transactionId = state?.transactionId;

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('별점을 선택하세요.');
      return;
    }
    if (!transactionId) {
      toast.error('결제 거래 정보가 없습니다.');
      return;
    }
    setLoading(true);
    try {
      await merchantService.createReview(merchantId, {
        transactionId,
        rating,
        content: content.trim() || undefined,
      });
      toast.success('리뷰가 등록되었습니다!');
      navigate(-1);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || '리뷰 등록 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout showNav={false}>
      <Header title="리뷰 작성" showBack />
      <div className="px-4 py-4 space-y-6">
        {/* 별점 */}
        <Card className="text-center">
          <p className="text-sm text-gray-500 mb-3">이 가맹점의 만족도는?</p>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} onClick={() => setRating(star)}>
                <Star
                  className={`w-10 h-10 transition-colors ${
                    star <= rating
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-200'
                  }`}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-sm mt-2 text-primary-600 font-medium">
              {['', '별로에요', '그저 그래요', '보통이에요', '좋아요', '최고예요'][rating]}
            </p>
          )}
        </Card>

        {/* 텍스트 */}
        <div>
          <label className="text-sm font-medium text-gray-700">한줄평 (선택)</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, 500))}
            placeholder="어떤 점이 좋았나요?"
            rows={4}
            className="input-field mt-1 resize-none"
          />
          <p className="text-xs text-gray-400 text-right mt-1">{content.length}/500</p>
        </div>

        <Button onClick={handleSubmit} disabled={loading || rating === 0}>
          {loading ? '등록 중...' : '리뷰 등록'}
        </Button>
      </div>
    </PageLayout>
  );
}
