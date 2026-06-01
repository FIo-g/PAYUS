/**
 * 세종페이 frontend — Tailwind config (앱 consumer)
 *
 * 디자인 시스템 v0.2 preset(./sejong-pay-design/tailwind.config.js)을 그대로 상속하고,
 * 이 앱이 스캔할 content 경로만 지정한다.
 *
 * preset에는 content 배열이 없어 유틸 클래스가 생성되지 않으므로, 여기서 content를
 * 채워야 bg-primary-500(크림슨) 등이 실제로 적용된다.
 * theme/darkMode/colors/spacing/radius/shadow/type/motion 토큰은 전부 preset에서 온다.
 */

const sejongPreset = require('./sejong-pay-design/tailwind.config.js');

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [sejongPreset],
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
};
