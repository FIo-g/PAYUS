'use strict';

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const transactionRoutes = require('./routes/transaction.routes');
const errorMiddleware = require('./middleware/error.middleware');

const app = express();

// NoSQL 인젝션 방지: 쿼리 필터에서 $ 연산자를 자동으로 제거한다
mongoose.set('sanitizeFilter', true);

app.use(express.json());

// 라우트 등록
app.use('/transactions', transactionRoutes);

// 중앙 에러 핸들러 — 반드시 라우트 등록 이후에 마지막으로 위치해야 한다
app.use(errorMiddleware);

module.exports = app;
