// src/components/common/ErrorBoundary.jsx
// 페이지 렌더 중 예외가 발생해도 앱 전체가 백화면이 되지 않도록 막는 전역 방어막.
// (개별 페이지의 데이터 파싱 오류 등이 React 트리 전체 언마운트로 번지는 것을 차단)
import { Component } from 'react';

export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // 운영 중 원인 추적용 — 어떤 페이지에서 무엇이 터졌는지 콘솔에 남긴다
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  handleReset = () => {
    // 전체 리로드로 상태를 초기화하고 홈으로 복귀
    window.location.href = '/home';
  };

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
          <p className="text-4xl mb-3">😵</p>
          <h1 className="text-lg font-bold mb-1">화면을 불러오지 못했습니다</h1>
          <p className="text-sm text-gray-500 mb-6">일시적인 오류가 발생했어요. 다시 시도해 주세요.</p>
          <button
            onClick={this.handleReset}
            className="px-6 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold"
          >
            홈으로 돌아가기
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
